type Db = import('mongodb').Db;

export async function getNextRecordId(
  db: Db,
  migrationRecordCollection: string
): Promise<number> {
  const { value } = await db
    .collection(migrationRecordCollection)
    .findOneAndUpdate({ id: -1 }, { $inc: { nextRecordId: 1 } });

  return value.nextRecordId;
}
