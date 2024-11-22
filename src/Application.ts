import { Schema } from "effect"

const RoleSchema = Schema.Literal("admin", "customer")
export type Role = typeof RoleSchema.Type
export const roles = RoleSchema.literals
export const isRole = Schema.is(RoleSchema)

export const assertsRole: Schema.Schema.ToAsserts<typeof RoleSchema> = Schema.asserts(RoleSchema)

const MembershipRoleSchema = Schema.Literal("owner", "member")
export type MembershipRole = typeof MembershipRoleSchema.Type
export const membershipRoles = MembershipRoleSchema.literals
export const isMembershipRole = Schema.is(MembershipRoleSchema)

export const assertsMembershipRole: Schema.Schema.ToAsserts<typeof MembershipRoleSchema> = Schema.asserts(
  MembershipRoleSchema
)

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
  organizationId: Schema.Number,
  userId: Schema.Number,
  membershipRole: MembershipRoleSchema
}) {}

export class MembershipAggregate extends Membership.extend<MembershipAggregate>("MembershipAggregate")({
  userEmail: Schema.String,
  userName: Schema.String
}) {}

export class OrganizationAggregate extends Organization.extend<OrganizationAggregate>("OrganizationAggregate")({
  memberships: Schema.Array(MembershipAggregate)
}) {}
