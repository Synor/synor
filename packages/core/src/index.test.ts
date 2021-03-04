import { SynorDatabase } from './database'
import { getGitUserInfo, sortVersions, Synor, SynorError } from './index'
import { getMigrationInfoParser } from './migration'
import { SynorMigrator } from './migrator'
import { SynorSource } from './source'

const database = jest.fn()
jest.mock('./database', () => ({
  SynorDatabase: jest.fn(() => database),
}))

jest.mock('./migration', () => ({
  getMigrationInfoParser: jest.fn(),
}))

const source = jest.fn()
jest.mock('./source', () => ({
  SynorSource: jest.fn(() => source),
}))

const migrationInfoNotation = {}
const migrationInfoParser = jest.fn()

describe('Synor', () => {
  describe('module exports', () => {
    test('exports helpers', () => {
      expect(getGitUserInfo).toBeInstanceOf(Function)
      expect(sortVersions).toBeInstanceOf(Function)
    })

    test('exports SynorError', () => {
      expect(SynorError).toBeInstanceOf(Function)
    })
  })

  test('can be initialized', () => {
    const config = { migrationInfoParser } as any

    const synor = Synor(config)

    expect(SynorDatabase).toBeCalledWith(config)
    expect(synor.database).toBe(database)

    expect(synor.migrator).toBeInstanceOf(SynorMigrator)

    expect(SynorSource).toBeCalledWith(config)
    expect(synor.source).toBe(source)
  })

  test('sets migrationInfoParser if not provided', () => {
    Synor({ migrationInfoNotation } as any)
    expect(getMigrationInfoParser).toHaveBeenCalledWith(migrationInfoNotation)
  })
})
