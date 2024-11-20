import type { D1Database } from "@cloudflare/workers-types"
import { D1Client } from "@effect/sql-d1"
import { Context, Data, Effect, Layer } from "effect"
import { Miniflare } from "miniflare"

export class MiniflareError extends Data.TaggedError("MiniflareError")<{
  cause: unknown
}> {}

export class D1Miniflare extends Context.Tag("test/D1Miniflare")<
  D1Miniflare,
  Miniflare
>() {
  static Live = Layer.scoped(
    this,
    Effect.acquireRelease(
      Effect.try({
        try: () =>
          new Miniflare({
            modules: true,
            d1Databases: {
              DB: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            },
            script: ""
          }),
        catch: (cause) => new MiniflareError({ cause })
      }),
      (miniflare) => Effect.promise(() => miniflare.dispose())
    )
  )

  static ClientLive = Layer.unwrapEffect(
    Effect.gen(function*() {
      const miniflare = yield* D1Miniflare
      const db: D1Database = yield* Effect.tryPromise(() => miniflare.getD1Database("DB"))
      return D1Client.layer({
        // db: Config.succeed(db)
        db
      })
    })
  ).pipe(Layer.provide(this.Live))
}

const program = Effect.gen(function*() {
  const sql = yield* D1Client.D1Client
  yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`
  yield* sql`INSERT INTO test (name) VALUES ('hello')`
  console.log(yield* sql`SELECT * FROM test`)
  yield* sql`INSERT INTO test (name) VALUES ('world')`
  console.log(yield* sql`SELECT * FROM test`)
}).pipe(Effect.provide(D1Miniflare.ClientLive))

Effect.runPromiseExit(program).then(console.log)

// const makeClient = Effect.gen(function*() {
//   return yield* SqliteClient.make({
//     filename: "./d1.db"
//   })
// })

// const program = Effect.gen(function*() {
//   const sql = yield* makeClient
//   console.log(yield* sql`drop table if exists test`)
//   console.log(yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)`)
//   console.log(yield* sql`INSERT INTO test (name) VALUES ('hello')`)
//   console.log(yield* sql`SELECT * FROM test`)
// })

// Effect.runPromiseExit(Effect.scoped(program)).then(console.log)
