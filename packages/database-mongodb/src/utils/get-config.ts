import { SynorError } from '@synor/core'
import { ConnectionString } from 'connection-string'

type MongoClientOptions = import('mongodb').MongoClientOptions

type MongoDBDatabaseConfig = Required<Pick<MongoClientOptions, 'appname'>> & {
  database: string
}

type MongoDBEngineConfig = {
  migrationRecordCollection: string
}

const validProtocol = ['mongodb', 'mongodb+srv']

export function getConfig(
  uri: string
): {
  databaseConfig: MongoDBDatabaseConfig
  engineConfig: MongoDBEngineConfig
} {
  try {
    const {
      protocol: parsedProtocol,
      hostname: host,
      path,
      params,
    } = new ConnectionString(uri, {
      params: {
        appname: '@synor/database-mongodb',
        synor_migration_record_collection: 'synor_migration_record',
      },
    })

    if (!parsedProtocol) {
      throw new Error(`[URI] missing: protocol!`)
    }

    // `ConnectionString` replaces `+` in protocol with ` `
    const protocol = parsedProtocol.replace(' ', '+')

    if (!validProtocol.includes(protocol)) {
      throw new Error(`[URI] unsupported: protocol(${protocol})!`)
    }

    if (!host) {
      throw new Error(`[URI] missing: host!`)
    }

    const database = path?.[0]

    if (!database) {
      throw new Error('[URI] missing: database!')
    }

    const databaseConfig: MongoDBDatabaseConfig = {
      appname: params!.appname,
      database,
    }

    const engineConfig: MongoDBEngineConfig = {
      migrationRecordCollection: params!.synor_migration_record_collection,
    }

    return {
      databaseConfig,
      engineConfig,
    }
  } catch (error) {
    throw new SynorError('Invalid DatabaseURI', 'exception', error)
  }
}
