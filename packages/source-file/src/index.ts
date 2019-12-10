import { sortVersions } from '@synor/core'
import { readdir as fsReadDir, readFile as fsReadFile } from 'fs'
import { join as joinPath } from 'path'
import { promisify } from 'util'

type MigrationInfo = import('@synor/core').MigrationInfo
type SourceEngine = import('@synor/core').SourceEngine
type SourceEngineFactory = import('@synor/core').SourceEngineFactory

type Type = MigrationInfo['type']
type Version = MigrationInfo['version']

const readFile = promisify(fsReadFile)
const readDir = promisify(fsReadDir)

type FileSourceEngine = SourceEngine

export const FileSourceEngine: SourceEngineFactory = (
  uri,
  { migrationInfoParser }
): FileSourceEngine => {
  const { pathname } = new URL(uri)

  const migrationsByVersion: Record<
    Version,
    Record<Type, MigrationInfo | undefined>
  > = {}

  const sortedVersions: Version[] = []

  const open: FileSourceEngine['open'] = async () => {
    const filenames = await readDir(pathname, { withFileTypes: true })
      .then(entries => entries.filter(entry => entry.isFile()))
      .then(entries => entries.map(entry => entry.name))

    for (const filename of filenames) {
      const migrationInfo = migrationInfoParser(filename)

      migrationsByVersion[migrationInfo.version] = {
        ...migrationsByVersion[migrationInfo.version],
        [migrationInfo.type]: migrationInfo
      }
    }

    const versions = sortVersions(Object.keys(migrationsByVersion))

    sortedVersions.push(...versions)
  }

  const close: FileSourceEngine['close'] = async () => {
    return Promise.resolve()
  }

  const first: FileSourceEngine['first'] = async () => {
    const version = sortedVersions[0]
    return Promise.resolve(version || null)
  }

  const prev: FileSourceEngine['prev'] = async version => {
    const index = sortedVersions.indexOf(version)
    const exists = index !== -1
    const first = index === 0

    if (first || !exists) {
      return Promise.resolve(null)
    }

    const prevVersion = sortedVersions[index - 1]

    return Promise.resolve(prevVersion)
  }

  const next: FileSourceEngine['next'] = async version => {
    const index = sortedVersions.indexOf(version)
    const exists = index !== -1
    const last = index === sortedVersions.length - 1

    if (last || !exists) {
      return Promise.resolve(null)
    }

    const nextVersion = sortedVersions[index + 1]

    return Promise.resolve(nextVersion)
  }

  const last: FileSourceEngine['last'] = async () => {
    const version = sortedVersions[sortedVersions.length - 1]
    return Promise.resolve(version || null)
  }

  const read: FileSourceEngine['read'] = async ({ filename }) => {
    const migrationFilePath = joinPath(pathname, filename)
    return readFile(migrationFilePath)
  }

  const get: FileSourceEngine['get'] = async (version, type) => {
    const migrations = migrationsByVersion[version]

    if (!migrations) {
      return Promise.resolve(null)
    }

    const migrationInfo = migrations[type]

    if (!migrationInfo) {
      return Promise.resolve(null)
    }

    return Promise.resolve(migrationInfo)
  }

  return {
    open,
    close,
    first,
    prev,
    next,
    last,
    get,
    read
  }
}
