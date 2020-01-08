import { SynorError } from './error'
import { getHash } from './utils/get-hash'

type SynorConfig = import('.').SynorConfig

export type MigrationType = 'do' | 'undo'

export type MigrationInfo = {
  version: string
  type: MigrationType
  title: string
  filename: string
}

export type MigrationInfoParser = (migrationFilename: string) => MigrationInfo

export type MigrationSource = {
  version: string
  type: MigrationType
  title: string
  hash: string
  body: string
}

export type MigrationRecord = {
  id: number
  version: string
  type: MigrationType
  title: string
  hash: string
  appliedAt: Date
  appliedBy: string
  executionTime: number
  dirty: boolean
}

export type MigrationRecordState = 'applied' | 'reverted'

export type MigrationHistory = Array<
  MigrationRecord & {
    state: MigrationRecordState
    revertedBy: number | null
  }
>

function getMigrationInfoRegex({
  do: DO,
  undo: UNDO,
  separator: SEPARATOR,
  extension: EXTENSION
}: SynorConfig['migrationInfoNotation']): RegExp {
  const version = `[0-9]+`
  const type = [DO, UNDO].join('|')
  const title = '[\\S ]+'

  return new RegExp(
    `^(${version}).(${type})${SEPARATOR}(${title})\\.(${EXTENSION})$`
  )
}

export const getMigrationInfoParser = (
  notation: SynorConfig['migrationInfoNotation']
): MigrationInfoParser => {
  const migrationInfoRegex = getMigrationInfoRegex(notation)

  const typeMap: Record<string, MigrationType> = {
    [notation.do]: 'do',
    [notation.undo]: 'undo'
  }

  return migrationFilename => {
    const infoMatches = migrationFilename.match(migrationInfoRegex)

    if (infoMatches === null) {
      throw new SynorError(`Invalid Filename: ${migrationFilename}`)
    }

    const [filename, version, type, title] = infoMatches

    return {
      version,
      type: typeMap[type],
      title,
      filename
    }
  }
}

export function SynorMigration(
  { version, type, title }: MigrationInfo,
  content: Buffer
): MigrationSource {
  const migration: MigrationSource = {
    version,
    type,
    title,
    get hash() {
      return getHash(this.body)
    },
    get body() {
      return content.toString('utf8')
    }
  }

  return migration
}
