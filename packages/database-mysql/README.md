[![Synor Database](https://img.shields.io/badge/synor-database-blue?style=for-the-badge)](https://github.com/Synor)
[![Version](https://img.shields.io/npm/v/@synor/database-mysql?style=for-the-badge)](https://npmjs.org/package/@synor/database-mysql)
[![Test](https://img.shields.io/travis/com/Synor/database-mysql/master?label=Test&style=for-the-badge)](https://travis-ci.com/Synor/database-mysql)
[![Coverage](https://img.shields.io/codecov/c/gh/Synor/database-mysql/master?style=for-the-badge)](https://codecov.io/gh/Synor/database-mysql)
[![License](https://img.shields.io/github/license/Synor/database-mysql?style=for-the-badge)](https://github.com/Synor/database-mysql/blob/master/LICENSE)

# Synor Database MySQL

Synor Database Engine - MySQL

## Installation

```sh
# using yarn:
yarn add @synor/database-mysql

# using npm:
npm install --save @synor/database-mysql
```

## URI

**Format**: `mysql://username:password@hostname:port/database[?params]`

**Params**:

| Name                           | Description                                                                   | Default Value            |
| ------------------------------ | ----------------------------------------------------------------------------- | ------------------------ |
| `synor-migration-record-table` | Name for Migration Record Table                                               | `synor_migration_record` |
| `ssl`                          | [MySQL SSL Options](https://www.npmjs.com/package/mysql/v/2.17.1#ssl-options) | `undefined`              |

**Examples**:

- `mysql://root:root@127.0.0.1:3306/synor?synor-migration-record-table=migration_record`
- `mysql://root:root@127.0.0.1:3306/synor?ssl=Amazon RDS`
- `mysql://root:root@127.0.0.1:3306/synor?ssl={"ca":"/mysql-ca.crt"}`

## License

Licensed under the MIT License. Check the [LICENSE](./LICENSE) file for details.
