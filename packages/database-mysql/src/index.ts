import { SynorError } from '@synor/core'
import { createConnection } from 'mysql'
import { performance } from 'perf_hooks'
import { getQueryStore } from './queries'
import { ensureMigrationRecordTable } from './utils/ensure-migration-record-table'
import { getConfig } from './utils/get-config'
import { runQuery } from './utils/run-query'

type Connection = import('mysql').Connection
type DatabaseEngine = import('@synor/core').DatabaseEngine
type DatabaseEngineFactory = import('@synor/core').DatabaseEngineFactory
type MigrationSource = import('@synor/core').MigrationSource

export type MigrationSourceContentRunner = (client: Connection) => Promise<void>

export const MySQLDatabaseEngine: DatabaseEngineFactory = (
  uri,
  { baseVersion, getAdvisoryLockId, getUserInfo }
): DatabaseEngine => {
  const { databaseConfig, engineConfig } = getConfig(uri)

  if (typeof getAdvisoryLockId !== 'function') {
    throw new SynorError(`Missing: getAdvisoryLockId`)
  }

  if (typeof getUserInfo !== 'function') {
    throw new SynorError(`Missing: getUserInfo`)
  }

  const advisoryLockId = getAdvisoryLockId(
    databaseConfig.database,
    engineConfig.migrationRecordTable
  ).join(':')

  const connection = createConnection(databaseConfig)

  const queryStore = getQueryStore(connection, {
    migrationRecordTable: engineConfig.migrationRecordTable,
    databaseName: databaseConfig.database,
    advisoryLockId,
  })

  let appliedBy = ''

  const open: DatabaseEngine['open'] = async () => {
    appliedBy = await getUserInfo()
    await queryStore.openConnection()
    await ensureMigrationRecordTable(queryStore, baseVersion)
  }

  const close: DatabaseEngine['close'] = async () => {
    await queryStore.closeConnection()
  }

  const lock: DatabaseEngine['lock'] = async () => {
    const lockResult = await queryStore.getLock()
    if ([0, null].includes(lockResult)) {
      throw new SynorError(`Failed to Get Lock: ${advisoryLockId}`)
    }
  }

  const unlock: DatabaseEngine['unlock'] = async () => {
    const lockResult = await queryStore.releaseLock()
    if ([0, null].includes(lockResult)) {
      throw new SynorError(`Failed to Release Lock: ${advisoryLockId}`)
    }
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
    run,
  }: MigrationSource) => {
    let dirty = false

    const startTime = performance.now()

    try {
      if (body) {
        await runQuery(connection, body)
      } else {
        await (run as MigrationSourceContentRunner)(connection)
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
        dirty,
      })
    }
  }

  const repair: DatabaseEngine['repair'] = async (records) => {
    await queryStore.deleteDirtyRecords()

    for (const { id, hash } of records) {
      await queryStore.updateRecord(id, { hash })
    }
  }

  const records: DatabaseEngine['records'] = async (startId) => {
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
    records,
  }
}

export default MySQLDatabaseEngine
