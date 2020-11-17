[![Synor Database](https://img.shields.io/badge/synor-database-blue?style=for-the-badge)](https://github.com/Synor)
[![Version](https://img.shields.io/npm/v/@synor/database-mongodb?style=for-the-badge)](https://npmjs.org/package/@synor/database-mongodb)
[![Coverage](https://img.shields.io/codecov/c/gh/Synor/synor/master?flag=database_mongodb&style=for-the-badge)](https://codecov.io/gh/Synor/synor/tree/master/packages/database-mongodb)
[![License](https://img.shields.io/npm/l/@synor/database-mongodb?style=for-the-badge)](https://github.com/Synor/synor/blob/master/packages/database-mongodb/blob/master/LICENSE)

# Synor Database MongoDB

Synor Database Engine - MongoDB

## Installation

```sh
# using yarn:
yarn add @synor/database-mongodb mongodb

# using npm:
npm install --save @synor/database-mongodb mongodb
```

## URI

**Format**: `mongodb[+srv]://[username:password@]hostname[:port]/database[?param=value&...]`

**Params**:

| Name                                | Description                          | Default Value            |
| ----------------------------------- | ------------------------------------ | ------------------------ |
| `synor_migration_record_collection` | Name for Migration Record Collection | `synor_migration_record` |

**Examples**:

- `mongodb://mongo:mongo@127.0.0.1:27017/synor?synor_migration_record_collection=migration_record`

## License

Licensed under the MIT License. Check the [LICENSE](./LICENSE) file for details.
