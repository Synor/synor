type Connection = import('mysql').Connection

export type QueryValue = boolean | number | string | Date

export async function runQuery<T = any>(
  connection: Connection,
  query: string,
  values: QueryValue[] = []
): Promise<T> {
  return new Promise((resolve, reject) => {
    connection.query(query, values, (err, results) => {
      if (err) {
        reject(err)
        return
      }

      resolve(results)
    })
  })
}
