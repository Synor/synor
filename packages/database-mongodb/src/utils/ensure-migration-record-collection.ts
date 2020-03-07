import { performance } from 'perf_hooks';
import { collectionExists } from './collection-exists';
import { getNextRecordId } from './get-next-record-id';

type Db = import('mongodb').Db;

export async function ensureMigrationRecordCollection(
  db: Db,
  migrationRecordCollection: string,
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

  const nextId = await getNextRecordId(db, migrationRecordCollection);

  await db.collection(migrationRecordCollection).insertOne({
    id: nextId,
    version: baseVersion,
    type: 'do',
    title: 'Base Entry',
    hash: '',
    appliedAt: new Date(),
    appliedBy: 'Synor',
    executionTime: Math.floor(endTime - startTime),
    dirty: false
  });
}
