/* eslint-disable @typescript-eslint/camelcase */

import { promisify } from 'util'
import { runQuery } from './utils/run-query'

type Connection = import('mysql2').Connection
type MigrationRecord = import('@synor/core').MigrationRecord
type QueryValue = import('./utils/run-query').QueryValue

type ColumnName =
  | 'version'
  | 'type'
  | 'title'
  | 'hash'
  | 'applied_at'
  | 'applied_by'
  | 'execution_time'
  | 'dirty'

type LockResult = 0 | 1 | null

export type QueryStore = {
  openConnection: () => Promise<void>
  closeConnection: () => Promise<void>

  getMigrationTableColumnNames: () => Promise<string[]>
  createMigrationTable: () => Promise<void>
  addColumn: Record<ColumnName, () => Promise<void>>

  getLock: () => Promise<LockResult>
  releaseLock: () => Promise<LockResult>

  getTableNames: () => Promise<string[]>
  dropTables: (tableNames: string[]) => Promise<void>

  getRecords: (startId?: number) => Promise<MigrationRecord[]>

  addRecord: (record: Omit<MigrationRecord, 'id'>) => Promise<void>
  deleteDirtyRecords: () => Promise<void>
  updateRecord: (
    id: MigrationRecord['id'],
    data: Pick<MigrationRecord, 'hash'>
  ) => Promise<void>
}

type QueryStoreOptions = {
  migrationRecordTable: string
  databaseName: string
  advisoryLockId: string
}

export function getQueryStore(
  connection: Connection,
  {
    migrationRecordTable: tableName,
    databaseName,
    advisoryLockId,
  }: QueryStoreOptions
): QueryStore {
  const openConnection = async (): Promise<void> => {}

  const closeConnection = promisify<void>((callback) =>
    connection.end((err) => callback(err))
  )

  const QueryRunner = <RawResult = any, Result = RawResult>(
    query: string,
    values: QueryValue[],
    formatter: (result: RawResult) => Result = (v) => (v as unknown) as Result
  ) => (): Promise<Result> => {
    return runQuery<RawResult>(
      connection,
      query.replace(/\s+/, ' ').trim(),
      values
    ).then(formatter)
  }

  const getMigrationTableColumnNames = QueryRunner<
    Array<{ column_name: string }>,
    string[]
  >(
    `
      SELECT column_name as column_name
      FROM information_schema.columns
      WHERE table_name = ? AND table_schema = ?;
    `,
    [tableName, databaseName],
    (rows) => rows.map(({ column_name }) => column_name)
  )

  const createMigrationTable = QueryRunner(
    `
      CREATE TABLE ?? (
        ?? INT NOT NULL AUTO_INCREMENT,
        CONSTRAINT ?? PRIMARY KEY (??)
      );
    `,
    [tableName, 'id', `${tableName}_pk`, 'id']
  )

  const addColumn = {
    version: QueryRunner(
      `
        ALTER TABLE ??
          ADD COLUMN ?? VARCHAR(128) NOT NULL;
      `,
      [tableName, 'version']
    ),
    type: QueryRunner(
      `
        ALTER TABLE ??
          ADD COLUMN ?? VARCHAR(16);
      `,
      [tableName, 'type']
    ),
    title: QueryRunner(
      `
        ALTER TABLE ??
          ADD COLUMN ?? TEXT;
      `,
      [tableName, 'title']
    ),
    hash: QueryRunner(
      `
        ALTER TABLE ??
          ADD COLUMN ?? TEXT;
      `,
      [tableName, 'hash']
    ),

    applied_at: QueryRunner(
      `
        ALTER TABLE ??
          ADD COLUMN ?? TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      `,
      [tableName, 'applied_at']
    ),
    applied_by: QueryRunner(
      `
        ALTER TABLE ??
          ADD COLUMN ?? VARCHAR(255);
      `,
      [tableName, 'applied_by']
    ),
    execution_time: QueryRunner(
      `
        ALTER TABLE ??
          ADD COLUMN ?? INT;
      `,
      [tableName, 'execution_time']
    ),
    dirty: QueryRunner(
      `
        ALTER TABLE ??
          ADD COLUMN ?? BOOLEAN DEFAULT false;
      `,
      [tableName, 'dirty']
    ),
  }

  const getLock = QueryRunner<[{ synor_lock: LockResult }], LockResult>(
    `
      SELECT GET_LOCK(?, -1) AS synor_lock;
    `,
    [advisoryLockId],
    ([{ synor_lock }]) => synor_lock
  )

  const releaseLock = QueryRunner<[{ synor_lock: LockResult }], LockResult>(
    `
      SELECT RELEASE_LOCK(?) AS synor_lock;
    `,
    [advisoryLockId],
    ([{ synor_lock }]) => synor_lock
  )

  const getTableNames = QueryRunner<Array<{ table_name: string }>, string[]>(
    `
      SELECT table_name as table_name
      FROM information_schema.tables
      WHERE table_schema = ?
    `,
    [databaseName],
    (rows) => rows.map(({ table_name }) => table_name)
  )

  const dropTables: QueryStore['dropTables'] = (tableNames) => {
    return QueryRunner(
      [
        `SET FOREIGN_KEY_CHECKS = 0;`,
        ...tableNames.map(() => `DROP TABLE IF EXISTS ??;`),
        `SET FOREIGN_KEY_CHECKS = 1;`,
      ].join('\n'),
      [...tableNames]
    )()
  }

  const getRecords: QueryStore['getRecords'] = (startId = 0) => {
    return QueryRunner<
      Array<Omit<MigrationRecord, 'dirty'> & { dirty: 0 | 1 }>,
      Array<Required<MigrationRecord>>
    >(
      `
        SELECT ??, ??, ??, ??, ??, ?? AS ?, ?? AS ?, ?? AS ?, ??
        FROM ??
        WHERE ?? >= ?;
      `,
      [
        'id',
        'version',
        'type',
        'title',
        'hash',
        'applied_at',
        'appliedAt',
        'applied_by',
        'appliedBy',
        'execution_time',
        'executionTime',
        'dirty',
        tableName,
        'id',
        startId,
      ],
      (rows) => rows.map((row) => ({ ...row, dirty: Boolean(row.dirty) }))
    )()
  }

  const addRecord: QueryStore['addRecord'] = ({
    version,
    type,
    title,
    hash,
    appliedAt,
    appliedBy,
    executionTime,
    dirty,
  }) => {
    return QueryRunner(
      `
        INSERT INTO ?? (
          ??, ??, ??, ??, ??, ??, ??, ??
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?
        )
      `,
      [
        tableName,
        'version',
        'type',
        'title',
        'hash',
        'applied_at',
        'applied_by',
        'execution_time',
        'dirty',
        version,
        type,
        title,
        hash,
        appliedAt,
        appliedBy,
        executionTime,
        dirty,
      ]
    )()
  }

  const deleteDirtyRecords = QueryRunner(
    `
      DELETE FROM ?? WHERE ?? = ?;
    `,
    [tableName, 'dirty', true]
  )

  const updateRecord: QueryStore['updateRecord'] = async (id, { hash }) => {
    return QueryRunner(
      `
        UPDATE ?? SET ?? = ?
          WHERE ?? = ?;
      `,
      [tableName, 'hash', hash, 'id', id]
    )()
  }

  return {
    openConnection,
    closeConnection,

    getMigrationTableColumnNames,
    createMigrationTable,
    addColumn,

    getLock,
    releaseLock,

    getTableNames,
    dropTables,

    getRecords,

    addRecord,
    deleteDirtyRecords,
    updateRecord,
  }
}
