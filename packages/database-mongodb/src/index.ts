import { SynorError, MigrationRecord } from '@synor/core';
import { performance } from 'perf_hooks';
import { MongoClient, Db } from 'mongodb';
import { ConnectionString } from 'connection-string';

type DatabaseEngine = import('@synor/core').DatabaseEngine;
type DatabaseEngineFactory = import('@synor/core').DatabaseEngineFactory;
type MigrationSource = import('@synor/core').MigrationSource;

async function noOp(): Promise<null> {
  await Promise.resolve(null);
  return null;
}

function parseConnectionString(
  cn: string
): {
  protocol: string;
  host: string;
  port: number;
  path: string[];
  params: Record<string, any>;
  database: string;
  migrationRecordTable: string;
} {
  console.log(cn);
  const { protocol, hostname: host, port, path, params } = new ConnectionString(
    cn,
    {
      params: {
        synor_migration_record_table: 'synor_migration_record'
      }
    }
  );

  console.log(cn);

  console.log('host ', host);
  console.log('port ', port);
  console.log('protocol ', protocol);
  console.log('path ', path);
  console.log('params ', params);

  if (!host || !protocol || !port || !path || !params) {
    throw new SynorError('Invalid connection uri');
  }
  const database = path?.[0];
  const migrationRecordTable = params.synor_migration_record_table;

  return {
    database,
    host,
    protocol,
    port,
    path,
    params,
    migrationRecordTable
  };
}

async function doesMigrationRecordTableExists(
  db: Db,
  mgCollName: string
): Promise<boolean> {
  const collections = await (
    await db.listCollections(
      {},
      {
        nameOnly: true
      }
    )
  ).toArray();
  return collections.map(c => c.name).includes(mgCollName);
}

async function findNextAutoIncrementedId(
  db: Db,
  mgCollName: string
): Promise<number> {
  const cursor = await db
    .collection(mgCollName)
    .find()
    .sort({ appliedAt: -1 })
    .limit(1);

  const lastEntry = await cursor.next();

  if (lastEntry?.id) {
    return (lastEntry.id as number) + 1;
  }
  return 1;
}

async function ensureMigrationRecordTableExists(
  db: Db,
  mgCollName: string,
  version: string
): Promise<void> {
  console.log('in ensure function, col name =', mgCollName);
  if (!(await doesMigrationRecordTableExists(db, mgCollName))) {
    console.log('adding base level entry');
    await db.createCollection(mgCollName);
    await db?.collection(mgCollName).insertOne({
      version,
      id: 1,
      type: 'do',
      title: 'base entry',
      hash: '',
      appliedAt: new Date(),
      appliedBy: '',
      executionTime: 0,
      dirty: false
    });
  }
}

async function deleteDirtyRecords(db: Db, mgCollName: string): Promise<void> {
  await db.collection(mgCollName).deleteMany({
    dirty: true
  });
}

async function updateRecord(
  db: Db,
  mgCollName: string,
  { id, hash }: { id: number; hash: string }
): Promise<void> {
  await db.collection(mgCollName).updateOne(
    {
      id
    },
    {
      $set: {
        hash
      }
    }
  );
}

export const MongoDbEngine: DatabaseEngineFactory = (
  uri,
  { baseVersion, getAdvisoryLockId, getUserInfo }
): DatabaseEngine => {
  if (typeof getAdvisoryLockId !== 'function') {
    throw new SynorError(`Missing: getAdvisoryLockId`);
  }

  if (typeof getUserInfo !== 'function') {
    throw new SynorError(`Missing: getUserInfo`);
  }

  const { database, migrationRecordTable } = parseConnectionString(uri);

  let client: MongoClient | null = null;
  let db: Db | null = null;

  return {
    async open() {
      console.log('in open function');
      client = await MongoClient.connect(uri);
      db = await client.db(database);
      await ensureMigrationRecordTableExists(
        db,
        migrationRecordTable,
        baseVersion
      );
    },
    async close() {
      console.log('in close function');
      if (client) {
        await client.close();
      }
    },
    async lock() {
      console.log('in lock function');
      await noOp();
    },
    async unlock() {
      console.log('in unlock function');
      await noOp();
    },
    async drop() {
      console.log('in drop function');
      if (!db) {
        throw new SynorError('Database connection is null');
      }
      const collections = await (
        await db.listCollections(
          {},
          {
            nameOnly: true
          }
        )
      ).toArray();

      await Promise.all(
        collections.map(async c => {
          if (db) {
            await db.dropCollection(c);
          }
        })
      );
    },
    async run({ version, type, title, hash, run }: MigrationSource) {
      console.log('in run function');
      let dirty = false;

      const startTime = performance.now();
      try {
        if (run && db) {
          await run({
            db
          });
        } else {
          throw new SynorError('Run function is null');
        }
      } catch (err) {
        dirty = true;
        console.error('error trying to run migration');
        throw err;
      } finally {
        const endTime = performance.now();
        const newRecordId = await findNextAutoIncrementedId(
          db as Db,
          migrationRecordTable
        );
        await db?.collection(migrationRecordTable).insert({
          id: newRecordId,
          version,
          type,
          title,
          hash,
          appliedAt: new Date(),
          appliedBy: '',
          executionTime: endTime - startTime,
          dirty
        });
      }
    },
    async repair(records) {
      console.log('in repair function');
      if (!db) {
        throw new SynorError('Database connection is null');
      }
      await deleteDirtyRecords(db, migrationRecordTable);

      for (const { id, hash } of records) {
        await updateRecord(db, migrationRecordTable, { id, hash });
      }
    },
    async records(startid: number) {
      console.log('in records function');
      if (!db) {
        throw new SynorError('Database connection is null');
      }

      const records = (await (
        await db.collection(migrationRecordTable).find({
          id: {
            $gte: startid
          }
        })
      ).toArray()) as MigrationRecord[];
      console.log(records);
      return records;
    }
  };
};
