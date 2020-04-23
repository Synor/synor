module.exports = {
  preset: 'ts-jest',
  testEnvironment: './jest.env.js',
  coveragePathIgnorePatterns: ['__fs__'],
  globals: {
    'ts-jest': {
      tsConfig: '../../tsconfig.test.json',
    },
  },
}
