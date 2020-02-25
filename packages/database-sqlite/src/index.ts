import { SynorError } from '@synor/core'
import SQLite from 'better-sqlite3'
import { performance } from 'perf_hooks'
import { getQueryStore } from './queries'
import { ensureMigrationRecordTable } from './utils/ensure-migration-record-table'
import { getConfig } from './utils/get-config'

type Database = import('better-sqlite3').Database
type DatabaseEngine = import('@synor/core').DatabaseEngine
type DatabaseEngineFactory = import('@synor/core').DatabaseEngineFactory
type MigrationSource = import('@synor/core').MigrationSource

export type MigrationSourceContentRunner = (client: Database) => Promise<void>

export const SQLiteDatabaseEngine: DatabaseEngineFactory = (
  uri,
  { baseVersion, getUserInfo }
): DatabaseEngine => {
  const { databaseConfig, engineConfig } = getConfig(uri)

  if (typeof getUserInfo !== 'function') {
    throw new SynorError(`Missing: getUserInfo`)
  }

  const database: Database = SQLite(databaseConfig.filepath, {
    fileMustExist: databaseConfig.fileMustExist,
    memory: databaseConfig.memory,
    readonly: databaseConfig.readonly,
    timeout: databaseConfig.timeout
  })

  const queryStore = getQueryStore(database, {
    migrationRecordTable: engineConfig.migrationRecordTable,
    schemaName: engineConfig.schema
  })

  let appliedBy = ''

  const open: DatabaseEngine['open'] = async () => {
    appliedBy = await getUserInfo()
    await ensureMigrationRecordTable(queryStore, baseVersion)
  }

  const close: DatabaseEngine['close'] = async () => {
    database.close()
  }

  const lock: DatabaseEngine['lock'] = async () => {
    await queryStore.getLock()
  }

  const unlock: DatabaseEngine['unlock'] = async () => {
    await queryStore.releaseLock()
  }

  const drop: DatabaseEngine['drop'] = async () => {
    const tableNames = await queryStore.getTableNames()
    await queryStore.dropTables(tableNames)
  }

  const run: DatabaseEngine['run'] = async ({
    version,
    type,
    title,
    hash,
    body,
    run
  }: MigrationSource) => {
    let dirty = false

    const startTime = performance.now()

    try {
      if (body) {
        database.exec(body)
      } else {
        await (run as MigrationSourceContentRunner)(database)
      }
    } catch (err) {
      dirty = true

      throw err
    } finally {
      const endTime = performance.now()

      await queryStore.addRecord({
        version,
        type,
        title,
        hash,
        appliedAt: new Date(),
        appliedBy,
        executionTime: endTime - startTime,
        dirty
      })
    }
  }

  const repair: DatabaseEngine['repair'] = async records => {
    await queryStore.deleteDirtyRecords()

    for (const { id, hash } of records) {
      await queryStore.updateRecord(id, { hash })
    }
  }

  const records: DatabaseEngine['records'] = async startId => {
    return queryStore.getRecords(startId)
  }

  return {
    open,
    close,
    lock,
    unlock,
    drop,
    run,
    repair,
    records
  }
}

export default SQLiteDatabaseEngine
