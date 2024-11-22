import { SqlClient } from "@effect/sql"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { Effect, Option, Schema } from "effect"
import { Membership, Organization, OrganizationAggregate, User } from "./Application.js"

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

            yield* sql`drop table if exists memberships`
            yield* sql`drop table if exists organizations`
            yield* sql`drop table if exists users`
            yield* sql`drop table if exists membership_roles`
            yield* sql`drop table if exists roles`

            yield* sql`create table if not exists roles (
              role_id text primary key
            )`
            yield* sql`create table if not exists membership_roles (
              membership_role_id text primary key
            )`

            yield* sql`create table if not exists users (
              user_id integer primary key,
              email text not null unique,
              name text not null default '', 
              role text not null references roles (role_id)
            )`
            yield* sql`create table if not exists organizations (
              organization_id integer primary key,
              name text not null
            )`

            yield* sql`create table if not exists memberships (
              organization_id integer not null references organizations (organization_id) on delete cascade,
              user_id integer not null references users (user_id) on delete cascade,
              membership_role not null references membership_roles (membership_role_id),
              primary key (organization_id, user_id))`

            yield* sql`insert into roles (role_id) values ('admin'), ('customer')`
            yield* sql`insert into membership_roles (membership_role_id) values ('owner'), ('member')`
          }),
        getUsers: () =>
          Effect.gen(function*() {
            const rows = yield* sql`select * from users`
            return yield* Schema.decodeUnknown(Schema.Array(User))(rows)
          }),
        getUser: ({ email }: Pick<typeof User.Type, "email">) =>
          Effect.gen(function*() {
            const [row] = yield* sql`select * from users where email = ${email}`
            return Option.fromNullable(row ? yield* Schema.decodeUnknown(User)(row) : null)
          }),
        createUser: ({ email, role }: Pick<typeof User.Type, "email" | "role">) =>
          Effect.gen(function*() {
            const [row] = yield* sql`insert into users (email, role) values (${email}, ${role}) returning *`
            return yield* Schema.decodeUnknown(User)(row)
          }),
        updateUserEmail: ({ email, userId }: Pick<typeof User.Type, "email" | "userId">) =>
          Effect.gen(function*() {
            const [row] = yield* sql`update users set email = ${email} where user_id = ${userId} returning *`
            return Option.fromNullable(row ? yield* Schema.decodeUnknown(User)(row) : null)
          }),

        deleteUser: ({ userId }: Pick<typeof User.Type, "userId">) =>
          Effect.gen(function*() {
            const [row] = yield* sql`delete from users where user_id = ${userId} returning *`
            return Option.fromNullable(row ? yield* Schema.decodeUnknown(User)(row) : null)
          }),

        getOrganization: ({ organizationId }: Pick<typeof Organization.Type, "organizationId">) =>
          Effect.gen(function*() {
            const [row] = yield* sql`select json_object('organizationId', organization_id, 'name', name, 'memberships', 
(select json_group_array(json_object('organizationId', organization_id, 'userId', m.user_id, 'userEmail', u.email, 'userName', u.name, 'membershipRole', membership_role)) 
from memberships m inner join users u on m.user_id = u.user_id where organization_id = o.organization_id)) as data
from organizations o where organization_id = ${organizationId}`
            console.log({ row })
            return Option.fromNullable(
              row ? yield* Schema.decodeUnknown(Schema.parseJson(OrganizationAggregate))(row.data) : null
            )
          }),

        createOrganization: ({ name }: Pick<typeof Organization.Type, "name">) =>
          Effect.gen(function*() {
            const [row] = yield* sql`insert into organizations (name) values (${name}) returning *`
            return yield* Schema.decodeUnknown(Organization)(row)
          }),

        deleteOrganization: ({ organizationId }: Pick<typeof Organization.Type, "organizationId">) =>
          Effect.gen(function*() {
            const [row] = yield* sql`delete from organizations where organization_id = ${organizationId} returning *`
            return Option.fromNullable(row ? yield* Schema.decodeUnknown(Organization)(row) : null)
          }),

        createMembership: (
          { membershipRole, organizationId, userId }: Pick<
            typeof Membership.Type,
            "organizationId" | "userId" | "membershipRole"
          >
        ) =>
          Effect.gen(function*() {
            const [row] =
              yield* sql`insert into memberships (organization_id, user_id, membership_role) values (${organizationId}, ${userId}, ${membershipRole}) returning *`
            return yield* Schema.decodeUnknown(Membership)(row)
          })
      }
    }),
    dependencies: [SqliteLive]
  }
) {}
