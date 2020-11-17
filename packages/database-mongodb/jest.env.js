const NodeEnvironment = require('jest-environment-node')
const { MongoClient } = require('mongodb')

const user = 'mongo'
const password = 'mongo'
const database = 'synor'
const uri = `mongodb://${user}:${password}@127.0.0.1:27017`

const sleep = async (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const connectToMongoDB = async () => {
  const client = await MongoClient.connect(uri, {
    poolSize: 1,
    useUnifiedTopology: true,
  })
  const db = client.db(database)
  return { client, db }
}

async function waitForMongoDB() {
  try {
    const { client, db } = await connectToMongoDB()

    await db
      .command({ usersInfo: { user, db: database } })
      .then(({ users }) => {
        const userExists = users.length
        if (!userExists) {
          return db.addUser(user, password, {
            roles: [{ role: 'dbOwner', db: database }],
          })
        }
      })

    await client.close()
  } catch (_) {
    await sleep(1000)
    return waitForMongoDB()
  }
}

class SynorDatabaseMongoDBTestEnvironment extends NodeEnvironment {
  constructor(config, context) {
    super(config, context)
    this.docblockPragmas = context.docblockPragmas
  }

  async setup() {
    await super.setup()
    await waitForMongoDB()
  }

  async teardown() {
    await super.teardown()
  }

  runScript(script) {
    return super.runScript(script)
  }
}

module.exports = SynorDatabaseMongoDBTestEnvironment
