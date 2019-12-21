import { createConnection } from 'mysql'
import { runQuery } from './run-query'

type Connection = import('mysql').Connection

const uri = 'mysql://root:root@127.0.0.1:3306/synor'

describe('utils:runQuery', () => {
  let connection: Connection

  beforeAll(() => {
    connection = createConnection(uri)
  })

  afterAll(() => {
    connection.destroy()
  })

  test('can execute query', async () => {
    await expect(runQuery(connection, 'SELECT 1;')).resolves.toMatchSnapshot()
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
