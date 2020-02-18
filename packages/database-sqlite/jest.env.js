const { execSync } = require('child_process')
const NodeEnvironment = require('jest-environment-node')
const path = require('path')

class SynorDatabaseSQLiteTestEnvironment extends NodeEnvironment {
  constructor(config, context) {
    super(config, context)
    this.docblockPragmas = context.docblockPragmas
  }

  async setup() {
    await super.setup()

    execSync(`mkdir -p ${path.resolve('__fs__')}`)
  }

  async teardown() {
    await super.teardown()
  }

  runScript(script) {
    return super.runScript(script)
  }
}

module.exports = SynorDatabaseSQLiteTestEnvironment
