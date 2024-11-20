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

export class User extends Schema.Class<User>("User")({
  userId: Schema.Number,
  email: Schema.String,
  name: Schema.String,
  role: RoleSchema
}) {}

export class Organization extends Schema.Class<Organization>("Organization")({
  organizationId: Schema.Number,
  name: Schema.String
}) {}

export class Membership extends Schema.Class<Membership>("Membership")({
  memberId: Schema.Number,
  // role: RoleSchema,
  organizationId: Schema.Number,
  userId: Schema.Number
  // invitedById: Schema.Number
}) {}

console.log(User.make({ userId: 1, email: "foo", name: "bar", role: "customer" }))

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
        db,
        transformResultNames: (s) => s.replace(/_([a-z])/g, (_, g1) => g1.toUpperCase())
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
    name text,
    role text,
    foreign key (role) references roles (role_id) on delete cascade
  )`
  yield* sql`drop table if exists roles`
  yield* sql`create table if not exists roles (
    role_id text primary key
  )`

  yield* sql`drop table if exists organizations`
  yield* sql`create table if not exists organizations (
    organization_id integer primary key,
    name text not null
  )`
  yield* sql`drop table if exists memberships`
  yield* sql`create table if not exists memberships (
    member_id integer primary key,
    role text,
    organization_id integer not null,
    user_id integer,
    invited_by_id integer,
    foreign key (organization_id) references organizations (organization_id) on delete cascade,
    foreign key (user_id) references users (user_id) on delete cascade,
    foreign key (invited_by_id) references users (user_id) on delete cascade 
  )`
  yield* sql`insert into roles (role_id) values ('admin'), ('customer')`
  yield* sql`insert into users (email, name, role) values ('user1@example.com', 'user 1', 'customer')`
  yield* sql`insert into organizations ( name ) values ('org-1')`
  yield* sql`insert into memberships (role, organization_id, user_id, invited_by_id) values ('customer', 1, 1, 1)`
  console.log(yield* sql`select * from users`)
  console.log(yield* sql`select * from roles`)
  console.log(yield* sql`select * from organizations`)
  console.log(yield* sql`select * from memberships`)

  const [userDto] = yield* sql`select * from users`
  const user = Schema.decodeUnknownSync(User)(userDto)
  console.log({ user })

  const [membershipDto] = yield* sql`select * from memberships`
  const membership = Schema.decodeUnknownSync(Membership)(membershipDto)
  console.log({ membership })

  //   console.log(
  //     yield* sql`select json_object('userId', user_id, 'email', email, 'name', name,
  // 'roles',  (select json_group_array(role_id) from user_to_role where user_id = u.user_id)) as data from users u`
  //   )

  //   const [userDto] = yield* sql`select json_object('userId', user_id, 'email', email, 'name', name,
  // 'roles',  (select json_group_array(role_id) from user_to_role where user_id = u.user_id)) as user from users u`
  //   console.log({ userDto })

  //   const user = Schema.decodeUnknownSync(Schema.parseJson(User))(userDto.user)
  //   console.log({ user })
}).pipe(Effect.provide(D1Miniflare.ClientLive))

Effect.runPromiseExit(program).then(console.log)
