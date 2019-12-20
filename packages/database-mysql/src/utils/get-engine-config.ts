import { SynorError } from '@synor/core'
import { URL } from 'url'

type MySQLDatabaseEngineConfig = {
  migrationTableName: string
}

export function getEngineConfig(uri: string): MySQLDatabaseEngineConfig {
  const { protocol, searchParams: params } = new URL(uri)

  if (protocol !== 'mysql:') {
    throw new SynorError(`Invalid DatabaseURI`)
  }

  const migrationTableName =
    params.get('synor-migration-record-table') || 'synor_migration_record'

  return {
    migrationTableName
  }
}
