import { getConfig } from './get-config'

describe('utils:getConfig', () => {
  let uri: Parameters<typeof getConfig>[0]

  beforeEach(() => {
    uri = 'sqlite://'
  })

  test('accepts sqlite uri without path', () => {
    expect(getConfig(uri).databaseConfig.filepath).toMatchInlineSnapshot(
      `":memory:"`
    )
  })

  test('accepts sqlite uri with path', () => {
    expect(
      getConfig(`${uri}/__fs__/synor.sqlite`).databaseConfig.filepath
    ).toMatchInlineSnapshot(`"/__fs__/synor.sqlite"`)
  })

  test(`throws if uri protocol is not 'sqlite:'`, () => {
    uri = uri.replace('sqlite:', 'mysql:')
    expect(() => getConfig(uri)).toThrow()
  })

  test('throws if protocol is missing', () => {
    uri = uri.replace('sqlite:', '')
    expect(() => getConfig(uri)).toThrow()
  })

  test('throws if uri is malformed', () => {
    uri = 'sqlite://username@password:hostname/synor.sqlite'
    expect(() => getConfig(uri)).toThrow()

    uri = 'sqlite://hostname/synor.sqlite'
    expect(() => getConfig(uri)).toThrow()
  })

  test('accepts custom migration record table name', () => {
    const tableName = 'migration_history'
    uri = `${uri}?synor_migration_record_table=${tableName}`
    expect(getConfig(uri).engineConfig.migrationRecordTable).toBe(tableName)
  })
})
