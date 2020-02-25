module.exports = {
  extends: [
    'standard-with-typescript',
    'plugin:prettier/recommended',
    'prettier/standard',
    'prettier/@typescript-eslint'
  ],
  parserOptions: {
    project: './tsconfig.json',
    createDefaultProgram: true
  },
  rules: {
    semi: ['error', 'always'],
    '@typescript-eslint/strict-boolean-expressions': 'off'
  },
  plugins: ['jest'],
  env: {
    'jest/globals': true
  }
};
