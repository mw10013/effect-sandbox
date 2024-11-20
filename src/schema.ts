import { Schema } from "effect"

const RoleSchema = Schema.Literal("admin", "customer")
export type Role = typeof RoleSchema.Type
export const roles = RoleSchema.literals
export const isRole = Schema.is(RoleSchema)

console.log({ isRole: isRole("customer") })
console.log({ isRole: isRole("student") })

const assertsRole: Schema.Schema.ToAsserts<typeof RoleSchema> = Schema.asserts(RoleSchema)
assertsRole("customer")

const value = Schema.decodeUnknownSync(RoleSchema)("customer")
console.log({ value, roles })

class User extends Schema.Class<User>("User")({
  id: Schema.Number,
  email: Schema.String,
  name: Schema.String,
  roles: Schema.Array(RoleSchema)
}) {}

console.log(User.make({ id: 1, email: "foo", name: "bar", roles: ["customer"] }))
