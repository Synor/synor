import { getConfig } from './get-config'

describe('utils:getConfig', () => {
  let uri: Parameters<typeof getConfig>[0]

  beforeEach(() => {
    uri = 'mongodb://mongo:mongo@127.0.0.1:27017/synor'
  })

  test('accepts mongodb uri', () => {
    expect(getConfig(uri)).toMatchSnapshot()
  })

  test('accepts mongodb+srv uri', () => {
    uri = uri.replace('mongodb:', 'mongodb+srv:')
    expect(getConfig(uri)).toMatchSnapshot()
  })

  test.each(['mongo:', 'mysql:'])(
    `throws if uri protocol is not valid`,
    (protocol) => {
      uri = uri.replace('mongodb:', protocol)
      expect(() => getConfig(uri)).toThrow()
    }
  )

  test('throws if protocol is missing', () => {
    uri = uri.replace('mongodb:', '')
    expect(() => getConfig(uri)).toThrow()
  })

  test('throws if host is missing', () => {
    uri = uri.replace('127.0.0.1', '')
    expect(() => getConfig(uri)).toThrow()
  })

  test('throws if database is missing', () => {
    uri = uri.replace('/synor', '')
    expect(() => getConfig(uri)).toThrow()
  })

  test('throws if uri is malformed', () => {
    uri = 'mongodb://@ _ @/synor'
    expect(() => getConfig(uri)).toThrow()
  })

  test('accepts custom migration record collection name', () => {
    const collectionName = 'migration_history'
    uri = `${uri}?synor_migration_record_collection=${collectionName}`
    expect(getConfig(uri).engineConfig.migrationRecordCollection).toBe(
      collectionName
    )
  })
})
