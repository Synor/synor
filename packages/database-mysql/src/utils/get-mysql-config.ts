import { SynorError } from '@synor/core'
import { URL } from 'url'

type ConnectionConfig = import('mysql').ConnectionConfig

type MySQLDatabaseConfig = Pick<ConnectionConfig, 'ssl'> &
  Required<
    Pick<
      ConnectionConfig,
      'database' | 'host' | 'port' | 'user' | 'password' | 'multipleStatements'
    >
  >

export function getMySQLConfig(uri: string): MySQLDatabaseConfig {
  const {
    protocol,
    pathname,
    hostname,
    port,
    username,
    password,
    searchParams
  } = new URL(uri)

  if (protocol !== 'mysql:') {
    throw new SynorError(`Invalid DatabaseURI`)
  }

  let ssl: ConnectionConfig['ssl']

  if (searchParams.has('ssl')) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const sslRaw = searchParams.get('ssl')!

    try {
      ssl = JSON.parse(sslRaw)
    } catch (_) {
      ssl = sslRaw
    }
  }

  return {
    database: pathname.replace(/^\//, ''),
    host: hostname,
    port: Number(port),
    user: username,
    password: password,
    multipleStatements: true,
    ssl
  }
}
