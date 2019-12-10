type MySQLDatabaseEngineConfig = {
  migrationTableName: string
}

export function getEngineConfig(uri: string): MySQLDatabaseEngineConfig {
  const { searchParams: params } = new URL(uri)

  const migrationTableName =
    params.get('synor-migration-record-table') || 'synor_migration_record'

  return {
    migrationTableName
  }
}
