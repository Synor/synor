import { performance } from 'perf_hooks';
import { collectionExists } from './collection-exists';

type Db = import('mongodb').Db;
type QueryStore = import('../queries').QueryStore;

export async function ensureMigrationRecordCollection(
  db: Db,
  migrationRecordCollection: string,
  queryStore: QueryStore,
  baseVersion: string
): Promise<void> {
  const exists = await collectionExists(db, migrationRecordCollection);

  if (exists) {
    return;
  }

  const startTime = performance.now();

  await db.createCollection(migrationRecordCollection);

  await db.createIndex(migrationRecordCollection, 'id', { unique: true });

  await db
    .collection(migrationRecordCollection)
    .insertOne({ id: -1, nextRecordId: 1 });

  const endTime = performance.now();

  await queryStore.addRecord({
    version: baseVersion,
    type: 'do',
    title: 'Base Entry',
    hash: '',
    appliedAt: new Date(),
    appliedBy: 'Synor',
    executionTime: endTime - startTime,
    dirty: false
  });
}
