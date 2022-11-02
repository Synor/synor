const NodeEnvironment = require('jest-environment-node')
const { createConnection } = require('mysql2')

const uri = 'mysql://root:root@127.0.0.1:3306/synor'

const sleep = async (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const pingMySQL = async () => {
  return new Promise((resolve, reject) => {
    const connection = createConnection(uri)
    connection.ping((err) => {
      connection.destroy()
      return err ? reject(err) : resolve()
    })
  })
}

async function waitForMySQL() {
  try {
    await pingMySQL()
  } catch (_) {
    await sleep(1000)
    return waitForMySQL()
  }
}

class SynorSourceMySQLTestEnvironment extends NodeEnvironment {
  constructor(config, context) {
    super(config, context)
    this.docblockPragmas = context.docblockPragmas
  }

  async setup() {
    await super.setup()
    await waitForMySQL()
  }

  async teardown() {
    await super.teardown()
  }

  runScript(script) {
    return super.runScript(script)
  }
}

module.exports = SynorSourceMySQLTestEnvironment
