module.exports = {
  extends: [
    'oclif',
    'oclif-typescript',
    'plugin:prettier/recommended',
    'prettier/@typescript-eslint'
  ],
  rules: {
    'new-cap': 'off',
    'node/no-missing-import': 'off'
  }
}
