import { SqliteClient } from "@effect/sql-sqlite-node"
import { Effect } from "effect"

const makeClient = Effect.gen(function*() {
  return yield* SqliteClient.make({
    filename: "./test.db"
  })
})

const program = Effect.gen(function*() {
  const sql = yield* makeClient
  console.log(yield* sql`drop table if exists test`)
  console.log(yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`)
  console.log(yield* sql`INSERT INTO test (name) VALUES ('hello')`)
  console.log(yield* sql`SELECT * FROM test`)
})

Effect.runPromiseExit(Effect.scoped(program)).then(console.log)
