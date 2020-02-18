type Database = import('better-sqlite3').Database
type RunResult = import('better-sqlite3').RunResult
type MigrationRecord = import('@synor/core').MigrationRecord

// type ColumnName =
//   | 'version'
//   | 'type'
//   | 'title'
//   | 'hash'
//   | 'applied_at'
//   | 'applied_by'
//   | 'execution_time'
//   | 'dirty'

export type QueryStore = {
  getMigrationTableColumnNames: () => Promise<string[]>
  createMigrationTable: () => Promise<RunResult>
  // addColumn: { [key in ColumnName]?: () => Promise<RunResult> }

  getLock: () => Promise<void>
  releaseLock: () => Promise<void>

  getTableNames: () => Promise<string[]>
  dropTables: (tableNames: string[]) => Promise<void>

  getRecords: (startId?: number) => Promise<MigrationRecord[]>

  addRecord: (record: Omit<MigrationRecord, 'id'>) => Promise<RunResult>
  deleteDirtyRecords: () => Promise<RunResult>
  updateRecord: (
    id: MigrationRecord['id'],
    data: Pick<MigrationRecord, 'hash'>
  ) => Promise<RunResult>
}

type QueryStoreOptions = {
  migrationRecordTable: string
  schemaName: string
}

export function getQueryStore(
  database: Database,
  { migrationRecordTable: tableName, schemaName }: QueryStoreOptions
): QueryStore {
  const getMigrationTableColumnNames: QueryStore['getMigrationTableColumnNames'] = async () => {
    return database
      .prepare(
        `
          SELECT info.name AS column_name
          FROM ${schemaName}.sqlite_master meta,
              PRAGMA_TABLE_INFO(meta.tbl_name) info
          WHERE meta.type = 'table'
            AND meta.tbl_name = :tableName;
        `
      )
      .all({ tableName })
      .map<string>(({ column_name }: { column_name: string }) => column_name)
  }

  const createMigrationTable: QueryStore['createMigrationTable'] = async () => {
    return database
      .prepare(
        `
          CREATE TABLE ${schemaName}.${tableName} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version VARCHAR(128) NOT NULL,
            type VARCHAR(16),
            title TEXT,
            hash TEXT,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            applied_by VARCHAR(255),
            execution_time INT,
            dirty TINYINT DEFAULT 0
          );
        `
      )
      .run()
  }

  // const addColumn = {}

  const getLock: QueryStore['getLock'] = async () => {
    database.pragma(`${schemaName}.locking_mode=EXCLUSIVE;`)
  }

  const releaseLock: QueryStore['releaseLock'] = async () => {
    database.pragma(`${schemaName}.locking_mode=NORMAL;`)
  }

  const getTableNames: QueryStore['getTableNames'] = async () => {
    return database
      .prepare(
        `
          SELECT tbl_name AS table_name
          FROM ${schemaName}.sqlite_master
          WHERE type = 'table';
        `
      )
      .all()
      .map<string>(({ table_name }: { table_name: string }) => table_name)
  }

  const dropTables: QueryStore['dropTables'] = async tableNames => {
    const internalSchemaPattern = /^sqlite_/

    const queries = tableNames
      .filter(tableName => !internalSchemaPattern.test(tableName))
      .map(tableName => `DROP TABLE IF EXISTS ${schemaName}.${tableName};`)
      .concat('VACUUM;')

    for (const query of queries) {
      database.prepare(query).run()
    }
  }

  const getRecords: QueryStore['getRecords'] = async (startId = 0) => {
    return database
      .prepare(
        `
          SELECT
            id, version, type, title, hash,
            applied_at AS appliedAt,
            applied_by AS appliedBy,
            execution_time AS executionTime,
            dirty
          FROM ${schemaName}.${tableName}
          WHERE id >= :startId;
        `
      )
      .all({ startId })
      .map<MigrationRecord>(
        (row: Omit<MigrationRecord, 'dirty'> & { dirty: 0 | 1 }) => ({
          ...row,
          dirty: Boolean(row.dirty)
        })
      )
  }

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
    return database
      .prepare(
        `
          INSERT INTO ${schemaName}.${tableName} (
            version, type, title, hash, applied_at, applied_by, execution_time, dirty
          ) VALUES (
            :version, :type, :title, :hash, :appliedAt, :appliedBy, :executionTime, :dirty
          );
        `
      )
      .run({
        version,
        type,
        title,
        hash,
        appliedAt: appliedAt.toISOString(),
        appliedBy,
        executionTime,
        dirty: +dirty
      })
  }

  const deleteDirtyRecords: QueryStore['deleteDirtyRecords'] = async () => {
    return database
      .prepare(`DELETE FROM ${schemaName}.${tableName} WHERE dirty = :dirty;`)
      .run({ dirty: 1 })
  }

  const updateRecord: QueryStore['updateRecord'] = async (id, { hash }) => {
    return database
      .prepare(
        `
          UPDATE ${schemaName}.${tableName}
            SET hash = :hash
            WHERE id = :id;
        `
      )
      .run({ hash, id })
  }

  return {
    getMigrationTableColumnNames,
    createMigrationTable,
    // addColumn,

    getLock,
    releaseLock,

    getTableNames,
    dropTables,

    getRecords,

    addRecord,
    deleteDirtyRecords,
    updateRecord
  }
}
