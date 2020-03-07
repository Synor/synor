import { getNextRecordId } from './utils/get-next-record-id';

type Db = import('mongodb').Db;
type MigrationRecord = import('@synor/core').MigrationRecord;

export type QueryStore = {
  getLock: () => Promise<void>;
  releaseLock: () => Promise<void>;

  addRecord: (record: Omit<MigrationRecord, 'id'>) => Promise<void>;
};

type QueryStoreOptions = {
  migrationRecordCollection: string;
  advisoryLockId: string;
};

const wait = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

export function getQueryStore(
  db: Db,
  {
    migrationRecordCollection: collectionName,
    advisoryLockId
  }: QueryStoreOptions
): QueryStore {
  const lockKey = ['lock', advisoryLockId, 'expires'].join(':');

  const getLock: QueryStore['getLock'] = async () => {
    let isLocked = true;

    while (isLocked) {
      const document = await db
        .collection(collectionName)
        .findOne({ id: -1 }, { projection: { [lockKey]: 1 } });

      isLocked = document[lockKey] > Date.now();

      await wait(isLocked ? 5000 : 0);
    }

    await db
      .collection(collectionName)
      .updateOne(
        { id: -1 },
        { $set: { [lockKey]: Date.now() + 5 * 60 * 1000 } }
      );
  };

  const releaseLock: QueryStore['releaseLock'] = async () => {
    await db
      .collection(collectionName)
      .updateOne({ id: -1 }, { $set: { [lockKey]: 0 } });
  };

  const addRecord: QueryStore['addRecord'] = async ({
    version,
    type,
    title,
    hash,
    appliedAt,
    appliedBy,
    executionTime,
    dirty
  }) => {
    const nextId = await getNextRecordId(db, collectionName);

    await db.collection(collectionName).insertOne({
      id: nextId,
      version,
      type,
      title,
      hash,
      appliedAt,
      appliedBy,
      executionTime: Math.floor(executionTime),
      dirty
    });
  };

  return {
    getLock,
    releaseLock,

    addRecord
  };
}
