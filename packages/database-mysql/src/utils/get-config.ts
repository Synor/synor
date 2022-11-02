import { SynorError } from '@synor/core'
import { ConnectionString } from 'connection-string'
import { readFileSync } from 'fs'
import { resolve as resolvePath } from 'path'

type ConnectionOptions = import('mysql2').ConnectionOptions
type TLSConnectionOptions = import('tls').ConnectionOptions

type SSLConfig = Pick<
  TLSConnectionOptions,
  'ca' | 'cert' | 'ciphers' | 'passphrase' | 'rejectUnauthorized'
> & {
  key?: string
}

type SSLParams = Pick<
  SSLConfig,
  'ciphers' | 'passphrase' | 'rejectUnauthorized'
> & {
  ca?: string
  key?: string
  cert?: string
}

type MySQLDatabaseConfig = Required<Pick<ConnectionOptions, 'database'>> &
  Pick<
    ConnectionOptions,
    'host' | 'port' | 'user' | 'password' | 'multipleStatements' | 'ssl'
  >

type MySQLEngineConfig = {
  migrationRecordTable: string
}

export function getConfig(
  uri: string
): {
  databaseConfig: MySQLDatabaseConfig
  engineConfig: MySQLEngineConfig
} {
  try {
    const {
      protocol,
      hostname: host,
      port,
      user,
      password,
      path,
      params,
    } = new ConnectionString(uri, {
      params: {
        synor_migration_record_table: 'synor_migration_record',
      },
    })

    if (!protocol) {
      throw new Error(`[URI] missing: protocol!`)
    }

    if (protocol !== 'mysql') {
      throw new Error(`[URI] unsupported: protocol(${protocol})!`)
    }

    const database = path?.[0]

    if (!database) {
      throw new Error('[URI] missing: database!')
    }

    let ssl: string | SSLConfig | undefined

    const sslRaw: string | undefined = params!.ssl

    if (sslRaw) {
      try {
        const sslParams: SSLParams = JSON.parse(sslRaw)

        ssl = {
          ciphers: sslParams.ciphers,
          passphrase: sslParams.passphrase,
          rejectUnauthorized: sslParams.rejectUnauthorized,
        }

        if (sslParams.ca) {
          ssl.ca = readFileSync(resolvePath(sslParams.ca))
        }
        if (sslParams.cert) {
          ssl.cert = readFileSync(resolvePath(sslParams.cert))
        }
        if (sslParams.key) {
          ssl.key = readFileSync(resolvePath(sslParams.key)).toString()
        }
      } catch (_) {
        ssl = sslRaw
      }
    }

    const databaseConfig: MySQLDatabaseConfig = {
      database,
      host,
      port,
      user,
      password,
      multipleStatements: true,
      ssl,
    }

    const engineConfig: MySQLEngineConfig = {
      migrationRecordTable: params!.synor_migration_record_table,
    }

    return {
      databaseConfig,
      engineConfig,
    }
  } catch (error) {
    throw new SynorError('Invalid DatabaseURI', 'exception', error)
  }
}
