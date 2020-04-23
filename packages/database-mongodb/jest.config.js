module.exports = {
  preset: 'ts-jest',
  testEnvironment: './jest.env.js',
  globals: {
    'ts-jest': {
      tsConfig: '../../tsconfig.test.json',
    },
  },
}
