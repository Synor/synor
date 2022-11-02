import { createConnection } from 'mysql2'
import { runQuery } from './run-query'

type Connection = import('mysql2').Connection

const uris = {
  mysql5: `mysql://root:root@127.0.0.1:33065/synor`,
  mysql8: `mysql://root:root@127.0.0.1:33068/synor`,
}

describe.each(Object.entries(uris))('for %s', (_, uri) => {
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
})
