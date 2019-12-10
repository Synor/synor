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
    pathname,
    hostname,
    port,
    username,
    password,
    searchParams
  } = new URL(uri)

  let ssl: ConnectionConfig['ssl']

  if (searchParams.has('ssl')) {
    const sslRaw = searchParams.get('ssl')

    try {
      ssl = JSON.parse(sslRaw!)
    } catch {
      ssl = sslRaw!
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
