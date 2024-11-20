import { Schema } from "effect"

const RoleSchema = Schema.Literal("admin", "customer")
export type Role = typeof RoleSchema.Type
export const roles = RoleSchema.literals
export const isRole = Schema.is(RoleSchema)

export const assertsRole: Schema.Schema.ToAsserts<typeof RoleSchema> = Schema.asserts(RoleSchema)

// const value = Schema.decodeUnknownSync(RoleSchema)("customer")
// console.log({ value, roles })

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

// console.log(User.make({ userId: 1, email: "foo", name: "bar", role: "customer" }))
