[![Synor Database](https://img.shields.io/badge/synor-database-blue?style=for-the-badge)](https://github.com/Synor)
[![Version](https://img.shields.io/npm/v/@synor/database-sqlite?style=for-the-badge)](https://npmjs.org/package/@synor/database-sqlite)
[![Test](https://img.shields.io/travis/com/Synor/database-sqlite/master?label=Test&style=for-the-badge)](https://travis-ci.com/Synor/database-sqlite)
[![Coverage](https://img.shields.io/codecov/c/gh/Synor/database-sqlite/master?style=for-the-badge)](https://codecov.io/gh/Synor/database-sqlite)
[![License](https://img.shields.io/npm/l/@synor/database-sqlite?style=for-the-badge)](https://github.com/Synor/synor/blob/master/packages/database-sqlite/blob/master/LICENSE)

# Synor Database SQLite

Synor Database Engine - SQLite

## Installation

```sh
# using yarn:
yarn add @synor/database-sqlite

# using npm:
npm install --save @synor/database-sqlite
```

## URI

**Format**: `sqlite://[.]/path[?param=value&...]`

**Params**:

| Name                           | Description                                                          | Default Value            |
| ------------------------------ | -------------------------------------------------------------------- | ------------------------ |
| `schema`                       | SQLite Schema name                                                   | `main`                   |
| `synor_migration_record_table` | Name for Migration Record Table                                      | `synor_migration_record` |
| `file_must_exist`              | Error will be thrown if the database file does not exist             | `false`                  |
| `memory`                       | Open an in-memory database, rather than a disk-bound one             | `false`                  |
| `readonly`                     | Open the database connection in readonly mode                        | `false`                  |
| `timeout`                      | Number of milliseconds to wait before throwing a `SQLITE_BUSY` error | `5000`                   |

**Examples**:

- `sqlite:///path/to/sqlite.db` (Absolute path)
- `sqlite://./path/to/sqlite.db` (Relative path)
- `sqlite://?memory=true` (Open an in-memory database)

## License

Licensed under the MIT License. Check the [LICENSE](./LICENSE) file for details.
