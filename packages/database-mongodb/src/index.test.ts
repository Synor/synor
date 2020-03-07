import { MongoClient } from 'mongodb';
import MongoDBEngine, { MongoDBDatabaseEngine } from './index';

type Db = import('mongodb').Db;
type GetAdvisoryLockId = import('@synor/core').GetAdvisoryLockId;
type GetUserInfo = import('@synor/core').GetUserInfo;

jest.setTimeout(10 * 1000);

jest.mock('perf_hooks');

const baseVersion = '0';
const getAdvisoryLockId: GetAdvisoryLockId = (databaseName, ...names) => {
  return [String(databaseName.length), String(names.join().length)];
};
const getUserInfo: GetUserInfo = () => Promise.resolve(`Jest`);

const databaseName = 'synor';
const collectionName = 'test_record';
const params = `synor_migration_record_collection=${collectionName}`;
const uri = `mongodb://mongo:mongo@127.0.0.1:27017/${databaseName}?${params}`;

const getCollectionNames = async (db: Db): Promise<string[]> => {
  const systemCollectionNameRegex = /^system\./;

  const collections = await db
    .listCollections({}, { nameOnly: true })
    .toArray();

  const collectionNames = collections
    .map(collection => collection.name)
    .filter(name => !systemCollectionNameRegex.test(name));

  return collectionNames;
};

describe('module exports', () => {
  test('default export exists', () => {
    expect(typeof MongoDBEngine).toBe('function');
  });

  test('named export exists', () => {
    expect(typeof MongoDBDatabaseEngine).toBe('function');
  });

  test('default and named exports are same', () => {
    expect(MongoDBEngine).toBe(MongoDBDatabaseEngine);
  });
});

describe('initialization', () => {
  let dbUri: Parameters<typeof MongoDBDatabaseEngine>[0];
  const helpers: Parameters<typeof MongoDBDatabaseEngine>[1] = {
    baseVersion,
    getAdvisoryLockId,
    getUserInfo
  };

  beforeEach(() => {
    dbUri = uri;
    helpers.baseVersion = baseVersion;
    helpers.getAdvisoryLockId = getAdvisoryLockId;
    helpers.getUserInfo = getUserInfo;
  });

  test.each([undefined, null, 0])('throws if uri is %s', uri => {
    expect(() => MongoDBDatabaseEngine(uri as any, helpers)).toThrow();
  });

  test('throws if uri is empty', () => {
    dbUri = ' ';
    expect(() => MongoDBDatabaseEngine(dbUri, helpers)).toThrow();
  });

  describe('helpers validation', () => {
    beforeEach(() => {
      helpers.getAdvisoryLockId = getAdvisoryLockId;
      helpers.getUserInfo = getUserInfo;
    });

    test(`throws if getAdvisoryLockId is missing`, () => {
      delete helpers.getAdvisoryLockId;
      expect(() => MongoDBDatabaseEngine(dbUri, helpers)).toThrow();
    });

    test(`throws if getAdvisoryLockId is not function`, () => {
      helpers.getAdvisoryLockId = '' as any;
      expect(() => MongoDBDatabaseEngine(dbUri, helpers)).toThrow();
      helpers.getAdvisoryLockId = null as any;
      expect(() => MongoDBDatabaseEngine(dbUri, helpers)).toThrow();
    });

    test(`throws if getUserInfo is missing`, () => {
      delete helpers.getUserInfo;
      expect(() => MongoDBDatabaseEngine(dbUri, helpers)).toThrow();
    });

    test(`throws if getUserInfo is not function`, () => {
      helpers.getUserInfo = '' as any;
      expect(() => MongoDBDatabaseEngine(dbUri, helpers)).toThrow();
      helpers.getUserInfo = null as any;
      expect(() => MongoDBDatabaseEngine(dbUri, helpers)).toThrow();
    });
  });
});

describe('methods: {open,close}', () => {
  let client: MongoClient;
  let db: Db;

  let engine: ReturnType<typeof MongoDBDatabaseEngine>;

  beforeAll(async () => {
    client = await MongoClient.connect(uri);
    db = client.db(databaseName);

    const collectionNames = await getCollectionNames(db);
    await Promise.all(collectionNames.map(name => db.dropCollection(name)));
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(() => {
    engine = MongoDBDatabaseEngine(uri, {
      baseVersion,
      getAdvisoryLockId,
      getUserInfo
    });
  });

  let documentCount: number;

  test('can open & close (first run)', async () => {
    documentCount = await db.collection(collectionName).countDocuments();

    expect(documentCount).toBe(0);

    await expect(engine.open()).resolves.toBeUndefined();

    documentCount = await db.collection(collectionName).countDocuments();

    expect(documentCount).toBeGreaterThan(0);

    await expect(engine.close()).resolves.toBeUndefined();
  });

  test('can open & close (after first run)', async () => {
    await expect(db.collection(collectionName).countDocuments()).resolves.toBe(
      documentCount
    );

    await expect(engine.open()).resolves.toBeUndefined();

    await expect(db.collection(collectionName).countDocuments()).resolves.toBe(
      documentCount
    );

    await expect(engine.close()).resolves.toBeUndefined();
  });
});

describe('methods: {lock,unlock}', () => {
  test('can lock & unlock', async () => {
    const engine = MongoDBDatabaseEngine(uri, {
      baseVersion,
      getAdvisoryLockId,
      getUserInfo
    });

    await engine.open();

    await expect(engine.lock()).resolves.toBeUndefined();

    await expect(engine.unlock()).resolves.toBeUndefined();

    await engine.close();
  });

  test('can not get multiple lock at once', async () => {
    const engineOne = MongoDBDatabaseEngine(uri, {
      baseVersion,
      getAdvisoryLockId,
      getUserInfo
    });

    const engineTwo = MongoDBDatabaseEngine(uri, {
      baseVersion,
      getAdvisoryLockId,
      getUserInfo
    });

    const callOrder: Array<'lock-1' | 'unlock-1' | 'lock-2' | 'unlock-2'> = [];

    await Promise.all([engineOne.open(), engineTwo.open()]);

    await engineOne.lock().then(() => {
      callOrder.push('lock-1');
    });

    await Promise.all([
      engineTwo.lock().then(() => {
        callOrder.push('lock-2');
      }),
      engineOne.unlock().then(() => {
        callOrder.push('unlock-1');
      })
    ]);

    await engineTwo.unlock().then(() => {
      callOrder.push('unlock-2');
    });

    expect(callOrder).toEqual(['lock-1', 'unlock-1', 'lock-2', 'unlock-2']);

    await Promise.all([engineOne.close(), engineTwo.close()]);
  });

  test('lock throws if failed to get', async () => {
    const queries = jest.requireActual('./queries');

    jest.spyOn(queries, 'getQueryStore').mockImplementationOnce((...args) => {
      const queryStore = queries.getQueryStore(...args);
      queryStore.getLock = () => Promise.reject(new Error());
      return queryStore;
    });

    const engine = MongoDBDatabaseEngine(uri, {
      baseVersion,
      getAdvisoryLockId,
      getUserInfo
    });

    await engine.open();

    await expect(engine.lock()).rejects.toThrow();

    await engine.close();
  });

  test('unlock throws if not locked', async () => {
    const engine = MongoDBDatabaseEngine(uri, {
      baseVersion,
      getAdvisoryLockId,
      getUserInfo
    });

    await engine.open();

    await expect(engine.unlock()).rejects.toThrow();

    await engine.close();
  });
});
