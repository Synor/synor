import { SynorError } from '@synor/core'
import { ConnectionString } from 'connection-string'
import Debug from 'debug'
import { resolve as resolvePath } from 'path'

type ConnectionConfig = import('better-sqlite3').Options

type SQLiteDatabaseConfig = {
  filepath: string
  fileMustExist: ConnectionConfig['fileMustExist']
  memory: ConnectionConfig['memory']
  readonly: ConnectionConfig['readonly']
  timeout: ConnectionConfig['timeout']
}

type SQLiteEngineConfig = {
  migrationRecordTable: string
  schema: string
}

const debug = Debug('@synor/database-sqlite')

const validHost = ['', '.']

export function getConfig(
  uri: string
): {
  databaseConfig: SQLiteDatabaseConfig
  engineConfig: SQLiteEngineConfig
} {
  try {
    const {
      protocol,
      hostname: host = '',
      path,
      params
    } = new ConnectionString(uri, {
      params: {
        schema: 'main',
        synor_migration_record_table: 'synor_migration_record',
        file_must_exist: false,
        memory: false,
        readonly: false,
        timeout: 5000
      }
    })

    if (!protocol) {
      throw new Error(`[URI] missing: protocol!`)
    }

    if (protocol !== 'sqlite') {
      throw new Error(`[URI] unsupported: protocol(${protocol})!`)
    }

    if (!validHost.includes(host)) {
      throw new Error(`[URI] unsupported: host(${host})!`)
    }

    let filepath: string

    if (!path) {
      debug('[URI] missing: path! Using in-memory database...')
      params!.memory = true
    }

    if (params!.memory) {
      filepath = ':memory:'
    } else {
      filepath = resolvePath(`${host}/${path!.join('/')}`)
    }

    const databaseConfig: SQLiteDatabaseConfig = {
      filepath,
      fileMustExist: JSON.parse(params!.file_must_exist),
      memory: JSON.parse(params!.memory),
      readonly: JSON.parse(params!.readonly),
      timeout: JSON.parse(params!.timeout)
    }

    const engineConfig: SQLiteEngineConfig = {
      migrationRecordTable: params!.synor_migration_record_table,
      schema: params!.schema
    }

    return {
      databaseConfig,
      engineConfig
    }
  } catch (error) {
    throw new SynorError('Invalid DatabaseURI', 'exception', error)
  }
}
