[![Synor Database](https://img.shields.io/badge/synor-database-blue?style=for-the-badge)](https://github.com/Synor)
[![Version](https://img.shields.io/npm/v/@synor/database-mysql?style=for-the-badge)](https://npmjs.org/package/@synor/database-mysql)
[![Test](https://img.shields.io/travis/com/Synor/database-mysql/master?label=Test&style=for-the-badge)](https://travis-ci.com/Synor/database-mysql)
[![Coverage](https://img.shields.io/codecov/c/gh/Synor/database-mysql/master?style=for-the-badge)](https://codecov.io/gh/Synor/database-mysql)
[![License](https://img.shields.io/github/license/Synor/database-mysql?style=for-the-badge)](https://github.com/Synor/database-mysql/blob/master/LICENSE)

# Synor Database MongoDB

Synor Database Engine - MongoDB

## Installation

```sh
# using yarn:
yarn add @synor/database-mongodb

# using npm:
npm install --save @synor/database-mongodb
```

## URI

**Format**: `mongodb://[user[:password]@][hostname][:port]/database[?param=value&...]`

**Params**:

| Name                           | Description                                                                   | Default Value            |
| ------------------------------ | ----------------------------------------------------------------------------- | ------------------------ |
| `ssl`                          | [MySQL SSL Options](https://www.npmjs.com/package/mysql/v/2.17.1#ssl-options) | `undefined`              |
| `synor_migration_record_table` | Name for Migration Record Table                                               | `synor_migration_record` |

**Examples**:

- `mongodb://root:root@127.0.0.1:27017/synor?synor_migration_record_table=migration_record`

## License

Licensed under the MIT License. Check the [LICENSE](./LICENSE) file for details.
