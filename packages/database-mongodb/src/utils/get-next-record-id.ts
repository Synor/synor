type Db = import('mongodb').Db;

export async function getNextRecordId(
  db: Db,
  migrationRecordCollection: string
): Promise<number> {
  const count = await db.collection(migrationRecordCollection).countDocuments();
  return count + 1;
}
