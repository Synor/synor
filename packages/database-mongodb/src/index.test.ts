import { MongoClient } from 'mongodb'
import MongoDBEngine, { MongoDBDatabaseEngine } from './index'

type Db = import('mongodb').Db
type GetAdvisoryLockId = import('@synor/core').GetAdvisoryLockId
type GetUserInfo = import('@synor/core').GetUserInfo
type MigrationSource = import('@synor/core').MigrationSource

jest.setTimeout(10 * 1000)

jest.mock('perf_hooks')

const getCollectionNames = async (db: Db): Promise<string[]> => {
  const systemCollectionNameRegex = /^system\./

  const collections = await db.listCollections({}, { nameOnly: true }).toArray()

  const collectionNames = collections
    .map((collection) => collection.name)
    .filter((name) => !systemCollectionNameRegex.test(name))

  return collectionNames
}

const migrationSource: Record<
  '01.do' | '01.undo' | '02.do' | '02.undo',
  MigrationSource
> = {
  '01.do': {
    version: '01',
    type: 'do',
    title: 'Test One',
    body: JSON.stringify({ create: 'one' }),
    hash: 'hash-01-do',
  },
  '01.undo': {
    version: '01',
    type: 'undo',
    title: 'Test One',
    body: JSON.stringify([{ drop: 'one' }]),
    hash: 'hash-01-undo',
  },
  '02.do': {
    version: '02',
    type: 'do',
    title: 'Test Two',
    hash: 'hash-02-do',
    run: (db: Db) => {
      return db.createCollection(`two`)
    },
  },
  '02.undo': {
    version: '02',
    type: 'undo',
    title: 'Test Two',
    hash: 'hash-02-undo',
    run: (_db: Db) => {
      throw new Error('¯\\_(ツ)_/¯')
    },
  },
}

const baseVersion = '0'
const getAdvisoryLockId: GetAdvisoryLockId = (databaseName, ...names) => {
  return [String(databaseName.length), String(names.join().length)]
}
const getUserInfo: GetUserInfo = () => Promise.resolve(`Jest`)

const databaseName = 'synor'
const collectionName = 'test_record'
const params = `synor_migration_record_collection=${collectionName}`
const uri = `mongodb://mongo:mongo@127.0.0.1:27017/${databaseName}?${params}`

describe('module exports', () => {
  test('default export exists', () => {
    expect(typeof MongoDBEngine).toBe('function')
  })

  test('named export exists', () => {
    expect(typeof MongoDBDatabaseEngine).toBe('function')
  })

  test('default and named exports are same', () => {
    expect(MongoDBEngine).toBe(MongoDBDatabaseEngine)
  })
})

describe('initialization', () => {
  let dbUri: Parameters<typeof MongoDBDatabaseEngine>[0]
  const helpers: Parameters<typeof MongoDBDatabaseEngine>[1] = {
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
    expect(() => MongoDBDatabaseEngine(uri as any, helpers)).toThrow()
  })

  test('throws if uri is empty', () => {
    dbUri = ' '
    expect(() => MongoDBDatabaseEngine(dbUri, helpers)).toThrow()
  })

  describe('helpers validation', () => {
    beforeEach(() => {
      helpers.getAdvisoryLockId = getAdvisoryLockId
      helpers.getUserInfo = getUserInfo
    })

    test(`throws if getAdvisoryLockId is missing`, () => {
      delete helpers.getAdvisoryLockId
      expect(() => MongoDBDatabaseEngine(dbUri, helpers)).toThrow()
    })

    test(`throws if getAdvisoryLockId is not function`, () => {
      helpers.getAdvisoryLockId = '' as any
      expect(() => MongoDBDatabaseEngine(dbUri, helpers)).toThrow()
      helpers.getAdvisoryLockId = null as any
      expect(() => MongoDBDatabaseEngine(dbUri, helpers)).toThrow()
    })

    test(`throws if getUserInfo is missing`, () => {
      delete helpers.getUserInfo
      expect(() => MongoDBDatabaseEngine(dbUri, helpers)).toThrow()
    })

    test(`throws if getUserInfo is not function`, () => {
      helpers.getUserInfo = '' as any
      expect(() => MongoDBDatabaseEngine(dbUri, helpers)).toThrow()
      helpers.getUserInfo = null as any
      expect(() => MongoDBDatabaseEngine(dbUri, helpers)).toThrow()
    })
  })
})

describe('methods: {open,close}', () => {
  let client: MongoClient
  let db: Db

  let engine: ReturnType<typeof MongoDBDatabaseEngine>

  beforeAll(async () => {
    client = await MongoClient.connect(uri)
    db = client.db(databaseName)

    const collectionNames = await getCollectionNames(db)
    await Promise.all(collectionNames.map((name) => db.dropCollection(name)))
  })

  afterAll(async () => {
    await client.close()
  })

  beforeEach(() => {
    engine = MongoDBDatabaseEngine(uri, {
      baseVersion,
      getAdvisoryLockId,
      getUserInfo,
    })
  })

  let documentCount: number

  test('can open & close (first run)', async () => {
    documentCount = await db.collection(collectionName).countDocuments()

    expect(documentCount).toBe(0)

    await expect(engine.open()).resolves.toBeUndefined()

    documentCount = await db.collection(collectionName).countDocuments()

    expect(documentCount).toBeGreaterThan(0)

    await expect(engine.close()).resolves.toBeUndefined()
  })

  test('can open & close (after first run)', async () => {
    await expect(db.collection(collectionName).countDocuments()).resolves.toBe(
      documentCount
    )

    await expect(engine.open()).resolves.toBeUndefined()

    await expect(db.collection(collectionName).countDocuments()).resolves.toBe(
      documentCount
    )

    await expect(engine.close()).resolves.toBeUndefined()
  })
})

describe('methods: {lock,unlock}', () => {
  test('can lock & unlock', async () => {
    const engine = MongoDBDatabaseEngine(uri, {
      baseVersion,
      getAdvisoryLockId,
      getUserInfo,
    })

    await engine.open()

    await expect(engine.lock()).resolves.toBeUndefined()

    await expect(engine.unlock()).resolves.toBeUndefined()

    await engine.close()
  })

  test('can not get multiple lock at once', async () => {
    const engineOne = MongoDBDatabaseEngine(uri, {
      baseVersion,
      getAdvisoryLockId,
      getUserInfo,
    })

    const engineTwo = MongoDBDatabaseEngine(uri, {
      baseVersion,
      getAdvisoryLockId,
      getUserInfo,
    })

    const callOrder: Array<'lock-1' | 'unlock-1' | 'lock-2' | 'unlock-2'> = []

    await Promise.all([engineOne.open(), engineTwo.open()])

    await engineOne.lock().then(() => {
      callOrder.push('lock-1')
    })

    await Promise.all([
      engineTwo.lock().then(() => {
        callOrder.push('lock-2')
      }),
      engineOne.unlock().then(() => {
        callOrder.push('unlock-1')
      }),
    ])

    await engineTwo.unlock().then(() => {
      callOrder.push('unlock-2')
    })

    expect(callOrder).toEqual(['lock-1', 'unlock-1', 'lock-2', 'unlock-2'])

    await Promise.all([engineOne.close(), engineTwo.close()])
  })

  test('lock throws if failed to get', async () => {
    const queries = jest.requireActual('./queries')

    jest.spyOn(queries, 'getQueryStore').mockImplementationOnce((...args) => {
      const queryStore = queries.getQueryStore(...args)
      queryStore.getLock = () => Promise.reject(new Error())
      return queryStore
    })

    const engine = MongoDBDatabaseEngine(uri, {
      baseVersion,
      getAdvisoryLockId,
      getUserInfo,
    })

    await engine.open()

    await expect(engine.lock()).rejects.toThrow()

    await engine.close()
  })

  test('unlock throws if not locked', async () => {
    const engine = MongoDBDatabaseEngine(uri, {
      baseVersion,
      getAdvisoryLockId,
      getUserInfo,
    })

    await engine.open()

    await expect(engine.unlock()).rejects.toThrow()

    await engine.close()
  })
})

describe('methods', () => {
  let client: MongoClient
  let db: Db

  let engine: ReturnType<typeof MongoDBDatabaseEngine>

  const OriginalDate = Date

  beforeAll(async () => {
    global.Date = class extends OriginalDate {
      constructor() {
        super('2020-01-01T00:00:00.000Z')
      }
    } as typeof global.Date

    client = await MongoClient.connect(uri)
    db = client.db(databaseName)

    const collectionNames = await getCollectionNames(db)
    await Promise.all(collectionNames.map((name) => db.dropCollection(name)))
  })

  afterAll(async () => {
    await client.close()

    global.Date = OriginalDate
  })

  beforeEach(async () => {
    engine = MongoDBDatabaseEngine(uri, {
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
    await expect(
      db.collection(collectionName).countDocuments()
    ).resolves.toBeGreaterThan(0)

    await expect(engine.drop()).resolves.toBeUndefined()

    await expect(db.collection(collectionName).countDocuments()).resolves.toBe(
      0
    )
  })

  test('run (with body)', async () => {
    await expect(engine.run(migrationSource['01.do'])).resolves.toBeUndefined()

    await expect(getCollectionNames(db)).resolves.toMatchInlineSnapshot(`
      Array [
        "test_record",
        "one",
      ]
    `)

    await expect(
      engine.run(migrationSource['01.undo'])
    ).resolves.toBeUndefined()

    await expect(getCollectionNames(db)).resolves.toMatchInlineSnapshot(`
      Array [
        "test_record",
      ]
    `)

    await expect(
      db
        .collection(collectionName)
        .find({ id: { $gte: 0 } })
        .project({ _id: 0 })
        .toArray()
    ).resolves.toMatchSnapshot()

    await engine.drop()
  })

  test('run (with run)', async () => {
    await expect(engine.run(migrationSource['02.do'])).resolves.toBeUndefined()

    await expect(getCollectionNames(db)).resolves.toMatchInlineSnapshot(`
      Array [
        "test_record",
        "two",
      ]
    `)

    await expect(
      db
        .collection(collectionName)
        .find({ id: { $gte: 0 } })
        .project({ _id: 0 })
        .toArray()
    ).resolves.toMatchSnapshot()

    await engine.drop()
  })

  test('repair', async () => {
    await expect(engine.run(migrationSource['02.do'])).resolves.toBeUndefined()
    await expect(engine.run(migrationSource['02.undo'])).rejects.toThrow()

    const records = await db
      .collection(collectionName)
      .find({ id: { $gte: 0 } })
      .project({ _id: 0 })
      .toArray()

    expect(records).toMatchSnapshot()

    const record = records.find(
      ({ version, type }) => version === '02' && type === 'do'
    )

    await expect(
      engine.repair([
        { id: record.id, hash: `${migrationSource['02.do'].hash}-repaired` },
      ])
    ).resolves.toBeUndefined()

    await expect(
      db
        .collection(collectionName)
        .find({ id: { $gte: 0 } })
        .project({ _id: 0 })
        .toArray()
    ).resolves.toMatchSnapshot()

    await engine.drop()
  })

  test('records', async () => {
    await expect(engine.run(migrationSource['01.do'])).resolves.toBeUndefined()
    await expect(
      engine.run(migrationSource['01.undo'])
    ).resolves.toBeUndefined()
    await expect(engine.run(migrationSource['02.do'])).resolves.toBeUndefined()
    await expect(engine.run(migrationSource['02.undo'])).rejects.toThrow()

    await expect(engine.records()).resolves.toMatchSnapshot()

    await engine.drop()
  })

  test('records (throws if startId is negative)', async () => {
    await expect(engine.records(-1)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Record ID must can not be negative!"`
    )

    await engine.drop()
  })
})
