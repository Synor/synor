module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '__utils__\\.test\\.[jt]s$'],
  globals: {
    'ts-jest': {
      tsConfig: '../../tsconfig.test.json',
    },
  },
}
