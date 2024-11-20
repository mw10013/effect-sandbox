import type { D1Database } from "@cloudflare/workers-types"
import { D1Client } from "@effect/sql-d1"
import { Context, Data, Effect, Layer, Schema } from "effect"
import { Miniflare } from "miniflare"

const RoleSchema = Schema.Literal("admin", "customer")
export type Role = typeof RoleSchema.Type
export const roles = RoleSchema.literals
export const isRole = Schema.is(RoleSchema)

export const assertsRole: Schema.Schema.ToAsserts<typeof RoleSchema> = Schema.asserts(RoleSchema)

const value = Schema.decodeUnknownSync(RoleSchema)("customer")
console.log({ value, roles })

class User extends Schema.Class<User>("User")({
  id: Schema.Number,
  email: Schema.String,
  name: Schema.String,
  roles: Schema.Array(RoleSchema)
}) {}

console.log(User.make({ id: 1, email: "foo", name: "bar", roles: ["customer"] }))

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
      miniflare.getCf()
      miniflare.getCaches()
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
  yield* sql`drop table if exists User`
  yield* sql`create table if not exists User (
    userId integer primary key,
    email text not null,
    name text
  )`
  yield* sql`drop table if exists Role`
  yield* sql`create table if not exists Role (
    roleId text primary key
  )`
  yield* sql`drop table if exists UserToRole`
  yield* sql`create table if not exists UserToRole (
    userId integer,
    roleId text,
    primary key (userId, roleId),
    foreign key (userId) references User (userId) on delete cascade,
    foreign key (roleId) references Role (roleId) on delete cascade
  )`

  yield* sql`insert into Role (roleId) values ('admin'), ('customer')`
  yield* sql`insert into User (email, name) values ('user1@example.com', 'user 1')`
  yield* sql`insert into UserToRole (userId, roleId) values (1, 'admin')`
  console.log(yield* sql`select * from User`)
  console.log(yield* sql`select * from Role`)
  console.log(yield* sql`select * from UserToRole`)

  console.log(
    yield* sql`select * from User
inner join UserToRole on User.userId = UserToRole.userId`
  )
  console.log(
    yield* sql`select json_object('userId', userId, 'email', email, 'name', name,
'roles',  (select json_group_array(roleId) from UserToRole where userId = u.userId)) as data from User u`
  )
}).pipe(Effect.provide(D1Miniflare.ClientLive))

Effect.runPromiseExit(program).then(console.log)
