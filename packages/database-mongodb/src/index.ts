import { MigrationRecord, SynorError } from '@synor/core';
import Debug from 'debug';
import { Db, MongoClient } from 'mongodb';
import { performance } from 'perf_hooks';
import { ensureMigrationRecordCollection } from './utils/ensure-migration-record-collection';
import { getConfig } from './utils/get-config';
import { getNextRecordId } from './utils/get-next-record-id';

type DatabaseEngine = import('@synor/core').DatabaseEngine;
type DatabaseEngineFactory = import('@synor/core').DatabaseEngineFactory;
type MigrationSource = import('@synor/core').MigrationSource;

const debug = Debug('@synor/database-mongodb');

async function noOp(): Promise<null> {
  await Promise.resolve(null);
  return null;
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

  const { databaseConfig, engineConfig } = getConfig(uri);

  let client: MongoClient | null = null;
  let db: Db | null = null;

  return {
    async open() {
      debug('in open function');
      client = await MongoClient.connect(uri, {
        appname: databaseConfig.appname,
        poolSize: 1
      });
      db = await client.db();
      await ensureMigrationRecordCollection(
        db,
        engineConfig.migrationRecordCollection,
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
        const nextId = await getNextRecordId(
          db!,
          engineConfig.migrationRecordCollection
        );
        await db?.collection(engineConfig.migrationRecordCollection).insert({
          id: nextId,
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
      await deleteDirtyRecords(db, engineConfig.migrationRecordCollection);

      for (const { id, hash } of records) {
        await updateRecord(db, engineConfig.migrationRecordCollection, {
          id,
          hash
        });
      }
    },
    async records(startid: number) {
      debug('in records function');
      if (!db) {
        throw new SynorError('Database connection is null');
      }

      const records = (await (
        await db.collection(engineConfig.migrationRecordCollection).find({
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
