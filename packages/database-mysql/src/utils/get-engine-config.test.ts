import { getEngineConfig } from './get-engine-config'

describe('utils:getEngineConfig', () => {
  let uri: Parameters<typeof getEngineConfig>[0]

  beforeEach(() => {
    uri = 'mysql://localhost/synor'
  })

  test('accepts mysql uri', () => {
    expect(getEngineConfig(uri)).toMatchSnapshot()
  })

  test('accepts custom migration record table name', () => {
    const tableName = 'migration_history'
    uri = `${uri}?synor-migration-record-table=${tableName}`
    expect(getEngineConfig(uri).migrationTableName).toBe(tableName)
  })

  test(`throws if uri protocol is not 'mysql:'`, () => {
    uri = 'postgresql://localhost/synor'
    expect(() => getEngineConfig(uri)).toThrow()
  })

  test('throws if uri is malformed', () => {
    uri = 'mysql://@_@/synor'
    expect(() => getEngineConfig(uri)).toThrow()
  })
})
