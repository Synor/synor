type Db = import('mongodb').Db;

export async function collectionExists(
  db: Db,
  collectionName: string
): Promise<boolean> {
  const result = await db
    .listCollections({ name: collectionName }, { nameOnly: true, batchSize: 1 })
    .toArray();

  return Boolean(result.length);
}
