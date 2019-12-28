import fs from 'fs'
import { getConfig } from './get-config'

describe('utils:getMySQLConfig', () => {
  let uri: Parameters<typeof getConfig>[0]

  beforeEach(() => {
    uri = 'mysql://root:root@127.0.0.1:3306/synor'
  })

  test('accepts mysql uri', () => {
    expect(getConfig(uri)).toMatchSnapshot()
  })

  test(`throws if uri protocol is not 'mysql:'`, () => {
    uri = uri.replace('mysql:', 'postgresql:')
    expect(() => getConfig(uri)).toThrow()
  })

  test('throws if protocol is missing', () => {
    uri = uri.replace('mysql:', '')
    expect(() => getConfig(uri)).toThrow()
  })

  test('throws if database is missing', () => {
    uri = uri.replace('/synor', '')
    expect(() => getConfig(uri)).toThrow()
  })

  test('throws if uri is malformed', () => {
    uri = 'mysql://@ _ @/synor'
    expect(() => getConfig(uri)).toThrow()
  })

  test('accepts custom migration record table name', () => {
    const tableName = 'migration_history'
    uri = `${uri}?synor_migration_record_table=${tableName}`
    expect(getConfig(uri).engineConfig.migrationRecordTable).toBe(tableName)
  })

  test('multipleStatements config is set', () => {
    expect(getConfig(uri).databaseConfig.multipleStatements).toBe(true)
  })

  describe('ssl config', () => {
    beforeEach(() => {
      uri = 'mysql://root:root@127.0.0.1:3306/synor'
    })

    test('accepts uri encoded string', () => {
      const ssl = 'Amazon RDS'
      uri = `${uri}?ssl=${encodeURIComponent(ssl)}`
      expect(getConfig(uri).databaseConfig.ssl).toBe(ssl)
    })

    test('accepts stringified json', () => {
      const ssl = { rejectUnauthorized: false }
      uri = `${uri}?ssl=${encodeURIComponent(JSON.stringify(ssl))}`
      expect(getConfig(uri).databaseConfig.ssl).toMatchObject(ssl)
    })

    test.each([
      ['ca', 'CA'],
      ['cert', 'CERT'],
      ['key', 'KEY']
    ])(`reads ssl.%s file content`, (key, content) => {
      jest
        .spyOn(fs, 'readFileSync')
        .mockImplementationOnce((v: any) => Buffer.from(`CONTENT:${v}`))

      const ssl = { [key]: content }
      uri = `${uri}?ssl=${encodeURIComponent(JSON.stringify(ssl))}`
      expect(
        ((getConfig(uri).databaseConfig.ssl as any)[key] as Buffer).toString()
      ).toMatch(new RegExp(`CONTENT:.+${content}`))
    })
  })
})
