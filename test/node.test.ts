import { SqliteClient } from "@effect/sql-sqlite-node"
import { describe, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { User } from "../src/Application.js"

const makeClient = Effect.gen(function*() {
  return yield* SqliteClient.make({
    filename: "./test.db",
    transformResultNames: (s) => s.replace(/_([a-z])/g, (_, g1) => g1.toUpperCase())
  })
})

describe("Node", () => {
  it.scoped("should work", () =>
    Effect.gen(function*() {
      const sql = yield* makeClient
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
      // assert.strictEqual(result.length, 1)
      // assert.strictEqual(result[0].name, "hello")
    }))
})
