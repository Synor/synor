import { getMySQLConfig } from './get-mysql-config'

describe('utils:getMySQLConfig', () => {
  let uri: Parameters<typeof getMySQLConfig>[0]

  beforeEach(() => {
    uri = 'mysql://root:root@127.0.0.1:3306/synor'
  })

  test('accepts mysql uri', () => {
    expect(getMySQLConfig(uri)).toMatchSnapshot()
  })

  test(`throws if uri protocol is not 'mysql:'`, () => {
    uri = uri.replace('mysql:', 'postgresql:')
    expect(() => getMySQLConfig(uri)).toThrow()
  })

  test('throws if uri is malformed', () => {
    uri = 'mysql://@_@/synor'
    expect(() => getMySQLConfig(uri)).toThrow()
  })

  test('multipleStatements config is set', () => {
    expect(getMySQLConfig(uri).multipleStatements).toBe(true)
  })

  describe('ssl config', () => {
    beforeEach(() => {
      uri = 'mysql://root:root@127.0.0.1:3306/synor'
    })

    test('accepts string', () => {
      const ssl = 'Amazon RDS'
      uri = `${uri}?ssl=${ssl}`
      expect(getMySQLConfig(uri).ssl).toBe(ssl)
    })

    test('accepts quoted string', () => {
      const ssl = '"Amazon RDS"'
      uri = `${uri}?ssl=${ssl}`
      expect(getMySQLConfig(uri).ssl).toBe(JSON.parse(ssl))
    })

    test('accepts stringified json', () => {
      const ssl = { ca: '/mysql-ca.crt', rejectUnauthorized: false }
      uri = `${uri}?ssl=${JSON.stringify(ssl)}`
      expect(getMySQLConfig(uri).ssl).toMatchObject(ssl)
    })
  })
})
