module.exports = {
  extends: ['@synor/eslint-config'],
  parserOptions: {
    project: './tsconfig.json',
    createDefaultProgram: true
  },
  rules: {
    semi: ['error', 'always']
  },
  plugins: ['jest'],
  env: {
    'jest/globals': true
  }
};
