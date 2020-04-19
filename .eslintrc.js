module.exports = {
  extends: ['@synor/eslint-config', 'plugin:jest/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    createDefaultProgram: true,
  },
  rules: {
    '@typescript-eslint/return-await': ['error', 'in-try-catch'],
  },
}
