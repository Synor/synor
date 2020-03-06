import { performance } from 'perf_hooks';
import { getNextRecordId } from './get-next-record-id';

type Db = import('mongodb').Db;

export async function ensureMigrationRecordCollection(
  db: Db,
  migrationRecordCollection: string,
  baseVersion: string
): Promise<void> {
  const nextId = await getNextRecordId(db, migrationRecordCollection);
  const hasBaseRecord = nextId > 1;

  if (hasBaseRecord) {
    return;
  }

  const startTime = performance.now();

  await db.createCollection(migrationRecordCollection);

  await db.createIndex(migrationRecordCollection, 'id', { unique: true });

  const endTime = performance.now();

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
