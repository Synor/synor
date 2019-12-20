import { runQuery } from './run-query'
import { getMySQLConfig } from './get-mysql-config'
import { createConnection } from 'mysql'

type Connection = import('mysql').Connection

describe('utils:runQuery', () => {
  let connection: Connection

  beforeAll(() => {
    connection = createConnection(
      getMySQLConfig('mysql://root:root@127.0.0.1:3306/synor')
    )

    connection.connect()
  })

  afterAll(() => {
    connection.end()
  })

  test('can execute single query', async () => {
    await expect(runQuery(connection, 'SELECT 1;')).resolves.toMatchSnapshot()
  })

  test('can execute multiple query', async () => {
    await expect(
      runQuery(connection, 'SELECT 1; SELECT 2;')
    ).resolves.toMatchSnapshot()
  })

  test('can substitute values in query', async () => {
    await expect(
      runQuery(connection, 'SELECT ?;', [1])
    ).resolves.toMatchSnapshot()
  })

  test('throws if malformed query', async () => {
    await expect(runQuery(connection, 'SELEC 1;')).rejects.toThrow()
  })
})
