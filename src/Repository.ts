import { SqlClient } from "@effect/sql"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { Effect, Option, Schema } from "effect"
import { User } from "./Application.js"

const SqliteLive = SqliteClient.layer({
  filename: "./test.db",
  transformResultNames: (s) => s.replace(/_([a-z])/g, (_, g1) => g1.toUpperCase())
})

export class Repository extends Effect.Service<Repository>()(
  "Repository",
  {
    effect: Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient

      return {
        setUp: () =>
          Effect.gen(function*() {
            yield* sql`pragma foreign_keys = on`
            yield* sql`drop table if exists users`
            yield* sql`create table if not exists users (
              user_id integer primary key,
              email text not null unique,
              name text not null default '', 
              role text not null references roles (role_id)
            )`
            yield* sql`drop table if exists roles`
            yield* sql`create table if not exists roles (
              role_id text primary key
            )`

            yield* sql`insert into roles (role_id) values ('admin'), ('customer')`
          }),
        getUsers: () =>
          Effect.gen(function*() {
            return yield* sql`select * from users`
          }),
        getUser: ({ email }: { email: string }) =>
          Effect.gen(function*() {
            const [row] = yield* sql`select * from users where email = ${email}`
            return Option.fromNullable(row ? yield* Schema.decodeUnknown(User)(row) : null)
          }),
        getUser1: ({ email }: { email: string }) =>
          Effect.gen(function*() {
            const [row] = yield* sql`select * from users where email = ${email}`
            // return Schema.decodeUnknownOption(User)(row)
            // return Option.map(Option.fromNullable(row), (row) => Schema.decodeUnknown(User)(row))
            // return yield* Schema.decodeUnknown(User)(row)
            return Option.fromNullable(row ? yield* Schema.decodeUnknown(User)(row) : null)
          }),
        createUser: ({ email, role }: { email: string; role: string }) =>
          Effect.gen(function*() {
            const [row] = yield* sql`insert into users (email, role) values (${email}, ${role}) returning *`
            return yield* Schema.decodeUnknown(User)(row)
          }),
        updateUserEmail: ({ email, userId }: { userId: number; email: string }) =>
          Effect.gen(function*() {
            const [row] = yield* sql`update users set email = ${email} where user_id = ${userId} returning *`
            return Option.fromNullable(row ? yield* Schema.decodeUnknown(User)(row) : null)
          }),

        deleteUser: ({ userId }: { userId: number }) =>
          Effect.gen(function*() {
            const [row] = yield* sql`delete from users where user_id = ${userId} returning *`
            return Option.fromNullable(row ? yield* Schema.decodeUnknown(User)(row) : null)
          })
      }
    }),
    dependencies: [SqliteLive]
  }
) {}
