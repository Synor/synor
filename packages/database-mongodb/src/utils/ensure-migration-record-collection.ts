import { performance } from 'perf_hooks'

type QueryStore = import('../queries').QueryStore

export async function ensureMigrationRecordCollection(
  queryStore: QueryStore,
  baseVersion: string
): Promise<void> {
  const collectionInfo = await queryStore.getMigrationRecordCollectionInfo()

  if (collectionInfo.exists) {
    return
  }

  const startTime = performance.now()

  await queryStore.createMigrationRecordCollection()

  const endTime = performance.now()

  await queryStore.addRecord({
    version: baseVersion,
    type: 'do',
    title: 'Base Entry',
    hash: '',
    appliedAt: new Date(),
    appliedBy: 'Synor',
    executionTime: endTime - startTime,
    dirty: false,
  })
}
