import { MigrationRecord, SynorError } from '@synor/core';
import Debug from 'debug';
import { Db, MongoClient } from 'mongodb';
import { performance } from 'perf_hooks';
import { getQueryStore } from './queries';
import { ensureMigrationRecordCollection } from './utils/ensure-migration-record-collection';
import { getConfig } from './utils/get-config';

type DatabaseEngine = import('@synor/core').DatabaseEngine;
type DatabaseEngineFactory = import('@synor/core').DatabaseEngineFactory;
type MigrationSource = import('@synor/core').MigrationSource;
type QueryStore = import('./queries').QueryStore;

const debug = Debug('@synor/database-mongodb');

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

  const advisoryLockId = getAdvisoryLockId(
    databaseConfig.database,
    engineConfig.migrationRecordCollection
  ).join(':');

  let client: MongoClient;
  let db: Db;

  let queryStore: QueryStore;

  const lock: DatabaseEngine['lock'] = async () => {
    debug('lock');
    try {
      await queryStore.getLock();
    } catch (_) {
      throw new SynorError(`Failed to Get Lock: ${advisoryLockId}`);
    }
  };

  const unlock: DatabaseEngine['unlock'] = async () => {
    debug('unlock');
    try {
      await queryStore.releaseLock();
    } catch (_) {
      throw new SynorError(`Failed to Release Lock: ${advisoryLockId}`);
    }
  };

  return {
    async open() {
      debug('in open function');
      client = await MongoClient.connect(uri, {
        appname: databaseConfig.appname,
        poolSize: 1
      });
      db = await client.db();
      queryStore = getQueryStore(db, {
        migrationRecordCollection: engineConfig.migrationRecordCollection,
        advisoryLockId
      });

      await ensureMigrationRecordCollection(queryStore, baseVersion);
    },
    async close() {
      debug('in close function');
      if (client) {
        await client.close();
      }
    },

    lock,
    unlock,

    async drop() {
      debug('in drop function');
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
          await db.dropCollection(c);
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
            await db.command(command);
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

        await queryStore.addRecord({
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

      await deleteDirtyRecords(db, engineConfig.migrationRecordCollection);

      for (const { id, hash } of records) {
        await updateRecord(db, engineConfig.migrationRecordCollection, {
          id,
          hash
        });
      }
    },
    async records(startId: number) {
      debug('in records function');

      if (startId < 0) {
        throw new SynorError('Record ID must can not be negative!');
      }

      const records = (await (
        await db.collection(engineConfig.migrationRecordCollection).find({
          id: {
            $gte: startId
          }
        })
      ).toArray()) as MigrationRecord[];
      debug(records);
      return records;
    }
  };
};

export default MongoDBDatabaseEngine;
