import { SynorError } from '@synor/core';
import Debug from 'debug';
import { Db, MongoClient } from 'mongodb';
import { performance } from 'perf_hooks';
import { getQueryStore } from './queries';
import { ensureMigrationRecordCollection } from './utils/ensure-migration-record-collection';
import { getConfig } from './utils/get-config';

type DatabaseEngine = import('@synor/core').DatabaseEngine;
type DatabaseEngineFactory = import('@synor/core').DatabaseEngineFactory;
type QueryStore = import('./queries').QueryStore;

export type MigrationSourceContentRunner = (db: Db) => Promise<void>;

const debug = Debug('@synor/database-mongodb');

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

  let appliedBy = '';

  const open: DatabaseEngine['open'] = async () => {
    debug('open');

    appliedBy = await getUserInfo();

    client = await MongoClient.connect(uri, {
      appname: databaseConfig.appname,
      poolSize: 1
    });
    db = client.db(databaseConfig.database);

    queryStore = getQueryStore(db, {
      migrationRecordCollection: engineConfig.migrationRecordCollection,
      advisoryLockId
    });

    await ensureMigrationRecordCollection(queryStore, baseVersion);
  };

  const close: DatabaseEngine['close'] = async () => {
    debug('close');

    await client.close();
  };

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

  const drop: DatabaseEngine['drop'] = async () => {
    debug('drop');
    const collectionNames = await queryStore.getCollectionNames();
    await queryStore.dropCollections(collectionNames);
  };

  const run: DatabaseEngine['run'] = async ({
    version,
    type,
    title,
    hash,
    body,
    run
  }) => {
    debug('run');

    let dirty = false;

    const startTime = performance.now();

    try {
      if (body) {
        const parsedBody = JSON.parse(body);
        const commands = Array.isArray(parsedBody) ? parsedBody : [parsedBody];
        for (const command of commands) {
          await db.command(command);
        }
      } else {
        await (run as MigrationSourceContentRunner)(db);
      }
    } catch (err) {
      dirty = true;

      throw err;
    } finally {
      const endTime = performance.now();

      await queryStore.addRecord({
        version,
        type,
        title,
        hash,
        appliedAt: new Date(),
        appliedBy,
        executionTime: endTime - startTime,
        dirty
      });
    }
  };

  const repair: DatabaseEngine['repair'] = async records => {
    debug('repair');

    await queryStore.deleteDirtyRecords();

    for (const { id, hash } of records) {
      await queryStore.updateRecord(id, { hash });
    }
  };

  const records: DatabaseEngine['records'] = async startId => {
    debug('records');
    return queryStore.getRecords(startId);
  };

  return {
    open,
    close,
    lock,
    unlock,
    drop,
    run,
    repair,
    records
  };
};

export default MongoDBDatabaseEngine;
