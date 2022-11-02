const NodeEnvironment = require('jest-environment-node')
const { createConnection } = require('mysql2')

const uris = {
  mysql5: 'mysql://root:root@127.0.0.1:33065/synor',
  mysql8: 'mysql://root:root@127.0.0.1:33068/synor',
}

const sleep = async (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const pingMySQL = async (uri) => {
  return new Promise((resolve, reject) => {
    const connection = createConnection(uri)
    connection.ping((err) => {
      connection.destroy()
      return err ? reject(err) : resolve()
    })
  })
}

async function waitForMySQL(uri) {
  try {
    await pingMySQL(uri)
  } catch (_) {
    await sleep(1000)
    return waitForMySQL(uri)
  }
}

class SynorSourceMySQLTestEnvironment extends NodeEnvironment {
  constructor(config, context) {
    super(config, context)
    this.docblockPragmas = context.docblockPragmas
  }

  async setup() {
    await super.setup()
    for (const [name, uri] of Object.entries(uris)) {
      console.log(`Waiting for ${name}...`)
      await waitForMySQL(uri)
    }
  }

  async teardown() {
    await super.teardown()
  }

  runScript(script) {
    return super.runScript(script)
  }
}

module.exports = SynorSourceMySQLTestEnvironment
