import SQLite from 'better-sqlite3'
import SQLiteEngine, { SQLiteDatabaseEngine } from './index'
import { getConfig } from './utils/get-config'

type Database = import('better-sqlite3').Database
type GetAdvisoryLockId = import('@synor/core').GetAdvisoryLockId
type GetUserInfo = import('@synor/core').GetUserInfo
type MigrationSource = import('@synor/core').MigrationSource

jest.setTimeout(10 * 1000)

jest.mock('perf_hooks')

const getTableColumnCount = (
  database: Database,
  schemaName: string,
  tableName: string
): number => {
  return database
    .prepare(
      `
        SELECT info.name AS column_name
        FROM ${schemaName}.sqlite_master AS meta, PRAGMA_TABLE_INFO(meta.tbl_name) AS info
        WHERE meta.type = 'table' AND meta.tbl_name = :tableName;
      `
    )
    .all({ tableName }).length
}

const migrationSource: Record<
  '01.do' | '01.undo' | '02.do',
  MigrationSource
> = {
  '01.do': {
    version: '01',
    type: 'do',
    title: 'Test One',
    body: 'SELECT 1;',
    hash: 'hash-01-do',
  },
  '01.undo': {
    version: '01',
    type: 'undo',
    title: 'Test One',
    body: 'SELEC -1;',
    hash: 'hash-01-undo',
  },
  '02.do': {
    version: '02',
    type: 'do',
    title: 'Test Two',
    hash: 'hash-02-do',
    run: async (client: Database) => {
      client.exec('SELECT 2;')
    },
  },
}

const baseVersion = '0'
const getAdvisoryLockId: GetAdvisoryLockId = () => [``, ``]
const getUserInfo: GetUserInfo = () => Promise.resolve(`Jest`)

const schemaName = 'main'
const tableName = 'test_record'
const params = `synor_migration_record_table=${tableName}&schema=${schemaName}`
const getUri = (filename: string): string => {
  return `sqlite://./__fs__/${filename}?${params}`
}

describe('module exports', () => {
  test('default export exists', () => {
    expect(typeof SQLiteEngine).toBe('function')
  })

  test('named export exists', () => {
    expect(typeof SQLiteDatabaseEngine).toBe('function')
  })

  test('default and named exports are same', () => {
    expect(SQLiteEngine).toBe(SQLiteDatabaseEngine)
  })
})

describe('initialization', () => {
  const uri = getUri('initialization.sqlite')

  let dbUri: Parameters<typeof SQLiteDatabaseEngine>[0]
  const helpers: Parameters<typeof SQLiteDatabaseEngine>[1] = {
    baseVersion,
    getAdvisoryLockId,
    getUserInfo,
  }

  beforeEach(() => {
    dbUri = uri
    helpers.baseVersion = baseVersion
    helpers.getAdvisoryLockId = getAdvisoryLockId
    helpers.getUserInfo = getUserInfo
  })

  test.each([undefined, null, 0])('throws if uri is %s', (uri) => {
    expect(() => SQLiteDatabaseEngine(uri as any, helpers)).toThrow()
  })

  test('throws if uri is empty', () => {
    dbUri = ' '
    expect(() => SQLiteDatabaseEngine(dbUri, helpers)).toThrow()
  })

  describe('helpers validation', () => {
    beforeEach(() => {
      helpers.getAdvisoryLockId = getAdvisoryLockId
      helpers.getUserInfo = getUserInfo
    })

    test(`throws if getUserInfo is missing`, () => {
      delete helpers.getUserInfo
      expect(() => SQLiteDatabaseEngine(dbUri, helpers)).toThrow()
    })

    test(`throws if getUserInfo is not function`, () => {
      helpers.getUserInfo = '' as any
      expect(() => SQLiteDatabaseEngine(dbUri, helpers)).toThrow()
      helpers.getUserInfo = null as any
      expect(() => SQLiteDatabaseEngine(dbUri, helpers)).toThrow()
    })
  })
})

describe('methods: {open,close}', () => {
  const uri = getUri('methods-open-close.sqlite')

  let database: Database

  let engine: ReturnType<typeof SQLiteDatabaseEngine>

  beforeAll(() => {
    const { filepath, ...options } = getConfig(uri).databaseConfig

    database = SQLite(filepath, options)

    database.prepare(`DROP TABLE IF EXISTS ${schemaName}.${tableName};`).run()
  })

  afterAll(() => {
    database.close()
  })

  beforeEach(() => {
    engine = SQLiteDatabaseEngine(uri, {
      baseVersion,
      getAdvisoryLockId,
      getUserInfo,
    })
  })

  let recordColumnCount: number

  test('can open & close (first run)', async () => {
    recordColumnCount = getTableColumnCount(database, schemaName, tableName)

    expect(recordColumnCount).toBe(0)

    await expect(engine.open()).resolves.toBeUndefined()

    recordColumnCount = getTableColumnCount(database, schemaName, tableName)

    expect(recordColumnCount).toBeGreaterThan(0)

    await expect(engine.close()).resolves.toBeUndefined()
  })

  test('can open & close (after first run)', async () => {
    expect(getTableColumnCount(database, schemaName, tableName)).toBe(
      recordColumnCount
    )

    await expect(engine.open()).resolves.toBeUndefined()

    expect(getTableColumnCount(database, schemaName, tableName)).toBe(
      recordColumnCount
    )

    await expect(engine.close()).resolves.toBeUndefined()
  })
})

describe('methods: {lock,unlock}', () => {
  const uri = getUri('methods-lock-unlock.sqlite')

  test('can lock & unlock', async () => {
    const engine = SQLiteDatabaseEngine(uri, {
      baseVersion,
      getAdvisoryLockId,
      getUserInfo,
    })

    await engine.open()

    await expect(engine.lock()).resolves.toBeUndefined()

    await expect(engine.unlock()).resolves.toBeUndefined()

    await engine.close()
  })
})

describe('methods', () => {
  const uri = getUri('methods.sqlite')

  let database: Database

  let engine: ReturnType<typeof SQLiteDatabaseEngine>

  const OriginalDate = Date

  beforeAll(() => {
    global.Date = class extends OriginalDate {
      constructor() {
        super('2020-01-01T00:00:00.000Z')
      }
    } as typeof global.Date

    const { filepath, ...options } = getConfig(uri).databaseConfig

    database = SQLite(filepath, options)

    database.prepare(`DROP TABLE IF EXISTS ${schemaName}.${tableName};`).run()
  })

  afterAll(() => {
    database.close()

    global.Date = OriginalDate
  })

  beforeEach(async () => {
    engine = SQLiteDatabaseEngine(uri, {
      baseVersion,
      getAdvisoryLockId,
      getUserInfo,
    })

    await engine.open()
  })

  afterEach(async () => {
    await engine.close()
  })

  test('drop', async () => {
    expect(
      getTableColumnCount(database, schemaName, tableName)
    ).toBeGreaterThan(0)

    await expect(engine.drop()).resolves.toBeUndefined()

    expect(getTableColumnCount(database, schemaName, tableName)).toBe(0)
  })

  test('run (with body)', async () => {
    await expect(engine.run(migrationSource['01.do'])).resolves.toBeUndefined()
    await expect(
      engine.run(migrationSource['01.undo'])
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"near \\"SELEC\\": syntax error"`
    )

    const rows = database
      .prepare(`SELECT * FROM ${schemaName}.${tableName};`)
      .all()

    expect(rows).toMatchSnapshot()

    await engine.drop()
  })

  test('run (with run)', async () => {
    await expect(engine.run(migrationSource['02.do'])).resolves.toBeUndefined()

    const rows = database
      .prepare(`SELECT * FROM ${schemaName}.${tableName};`)
      .all()

    expect(rows).toMatchSnapshot()

    await engine.drop()
  })

  test('repair', async () => {
    await expect(engine.run(migrationSource['01.do'])).resolves.toBeUndefined()
    await expect(
      engine.run(migrationSource['01.undo'])
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"near \\"SELEC\\": syntax error"`
    )

    const record = database
      .prepare(
        `SELECT id FROM ${schemaName}.${tableName} WHERE version = :version AND type = :type;`
      )
      .get({
        version: migrationSource['01.do'].version,
        type: migrationSource['01.do'].type,
      })

    await expect(
      engine.repair([
        { id: record.id, hash: `${migrationSource['01.do'].hash}-repaired` },
      ])
    ).resolves.toBeUndefined()

    const rows = database
      .prepare(`SELECT * FROM ${schemaName}.${tableName};`)
      .all()

    expect(rows).toMatchSnapshot()

    await engine.drop()
  })

  test('records', async () => {
    await expect(engine.run(migrationSource['01.do'])).resolves.toBeUndefined()
    await expect(
      engine.run(migrationSource['01.undo'])
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"near \\"SELEC\\": syntax error"`
    )

    await expect(engine.records()).resolves.toMatchSnapshot()

    await engine.drop()
  })
})
