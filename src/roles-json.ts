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
  userId: Schema.Number,
  email: Schema.String,
  name: Schema.String,
  roles: Schema.Array(RoleSchema)
}) {}

console.log(User.make({ userId: 1, email: "foo", name: "bar", roles: ["customer"] }))

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
  yield* sql`drop table if exists users`
  yield* sql`create table if not exists users (
    user_id integer primary key,
    email text not null,
    name text
  )`
  yield* sql`drop table if exists roles`
  yield* sql`create table if not exists roles (
    role_id text primary key
  )`
  yield* sql`drop table if exists user_to_role`
  yield* sql`create table if not exists user_to_role (
    user_id integer,
    role_id text,
    primary key (user_id, role_id),
    foreign key (user_id) references users (user_id) on delete cascade,
    foreign key (role_id) references roles (role_id) on delete cascade
  )`

  yield* sql`insert into roles (role_id) values ('admin'), ('customer')`
  yield* sql`insert into users (email, name) values ('user1@example.com', 'user 1')`
  yield* sql`insert into users (email, name) values ('user2@example.com', 'user 2')`
  yield* sql`insert into user_to_role (user_id, role_id) values (1, 'admin')`
  yield* sql`insert into user_to_role (user_id, role_id) values (2, 'customer')`
  console.log(yield* sql`select * from users`)
  console.log(yield* sql`select * from roles`)
  console.log(yield* sql`select * from user_to_role`)

  console.log(
    yield* sql`select * from users
inner join user_to_role on users.user_id = user_to_role.user_id`
  )
  console.log(
    yield* sql`select json_object('userId', user_id, 'email', email, 'name', name,
'roles',  (select json_group_array(role_id) from user_to_role where user_id = u.user_id)) as data from users u`
  )

  const [userDto] = yield* sql`select json_object('userId', user_id, 'email', email, 'name', name,
'roles',  (select json_group_array(role_id) from user_to_role where user_id = u.user_id)) as user from users u`
  console.log({ userDto })

  const user = Schema.decodeUnknownSync(Schema.parseJson(User))(userDto.user)
  console.log({ user })
}).pipe(Effect.provide(D1Miniflare.ClientLive))

Effect.runPromiseExit(program).then(console.log)
