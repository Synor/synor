import { MigrationRecord, SynorError } from '@synor/core';
import { ConnectionString } from 'connection-string';
import Debug from 'debug';
import { Db, MongoClient } from 'mongodb';
import { performance } from 'perf_hooks';

type DatabaseEngine = import('@synor/core').DatabaseEngine;
type DatabaseEngineFactory = import('@synor/core').DatabaseEngineFactory;
type MigrationSource = import('@synor/core').MigrationSource;

const debug = Debug('@synor/database-mongodb');

async function noOp(): Promise<null> {
  await Promise.resolve(null);
  return null;
}

function parseConnectionString(
  cn: string
): {
  protocol: string;
  host: string;
  port: number | undefined;
  path: string[];
  params: Record<string, any>;
  database: string;
  migrationRecordTable: string;
} {
  debug(cn);
  const { protocol, hostname: host, port, path, params } = new ConnectionString(
    cn,
    {
      params: {
        synor_migration_record_table: 'synor_migration_record'
      }
    }
  );

  debug('host ', host);
  debug('port ', port);
  debug('protocol ', protocol);
  debug('path ', path);
  debug('params ', params);

  if (!host || !protocol || !path || !params) {
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
  debug('in ensure function, col name =', mgCollName);
  if (!(await doesMigrationRecordTableExists(db, mgCollName))) {
    debug('adding base level entry');
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

export const MongoDBDatabaseEngine: DatabaseEngineFactory = (
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
      debug('in open function');
      client = await MongoClient.connect(uri);
      db = await client.db(database);
      await ensureMigrationRecordTableExists(
        db,
        migrationRecordTable,
        baseVersion
      );
    },
    async close() {
      debug('in close function');
      if (client) {
        await client.close();
      }
    },
    async lock() {
      debug('in lock function');
      await noOp();
    },
    async unlock() {
      debug('in unlock function');
      await noOp();
    },
    async drop() {
      debug('in drop function');
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
    async run({ version, type, title, hash, body, run }: MigrationSource) {
      debug('in run function');
      let dirty = false;

      const startTime = performance.now();
      try {
        if (body) {
          const parsedBody = JSON.parse(body);
          const commands = Array.isArray(parsedBody)
            ? parsedBody
            : [parsedBody];
          for (const command of commands) {
            await db?.command(command);
          }
        } else if (run) {
          await run({ db });
        } else {
          throw new SynorError('invalid migration source');
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
      debug('in repair function');
      if (!db) {
        throw new SynorError('Database connection is null');
      }
      await deleteDirtyRecords(db, migrationRecordTable);

      for (const { id, hash } of records) {
        await updateRecord(db, migrationRecordTable, { id, hash });
      }
    },
    async records(startid: number) {
      debug('in records function');
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
      debug(records);
      return records;
    }
  };
};

export default MongoDBDatabaseEngine;
