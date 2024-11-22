import { assert, beforeAll, expect, layer } from "@effect/vitest"
import { Cause, Effect, Option } from "effect"
import { Repository } from "../src/Repository.js"

layer(Repository.Default)((it) => {
  const userId = 1
  const email = "foo@mail.com"

  beforeAll(() => {
    Effect.runPromise(
      Effect.gen(function*() {
        const repository = yield* Repository
        yield* repository.setUp()
      }).pipe(Effect.provide(Repository.Default))
    )
  })

  it.effect("should create user", () =>
    Effect.gen(function*() {
      const repository = yield* Repository
      const user = yield* repository.createUser({ email, role: "customer" })
      //   assert.deepStrictEqual(user, { userId })
      expect(user).toMatchObject({ email })

      const cause = yield* Effect.cause(repository.createUser({ email: "foo@mail.com", role: "customer" }))
      const pretty = Cause.pretty(cause, { renderErrorCause: true })
      assert.include(pretty, "[cause]: SqliteError: UNIQUE constraint failed")
    }))

  it.effect("should get user", () =>
    Effect.gen(function*() {
      const repository = yield* Repository
      const user = yield* repository.getUser({ email })
      expect(Option.getOrNull(user)).toMatchObject({ email })

      const user2 = yield* repository.getUser({ email: email + email })
      expect(Option.isNone(user2)).toBeTruthy()
    }))

  it.effect("should update user email", () =>
    Effect.gen(function*() {
      const repository = yield* Repository
      const email2 = "bar@mail.com"
      const result = yield* repository.updateUserEmail({ email: email2, userId })
      expect(Option.getOrNull(result)).toMatchObject({ email: email2 })

      const result2 = yield* repository.updateUserEmail({ email, userId })
      expect(Option.getOrNull(result2)).toMatchObject({ email })

      const result3 = yield* repository.updateUserEmail({ email, userId: 0 })
      expect(Option.isNone(result3)).toBeTruthy()
    }))

  it.effect("should get delete user", () =>
    Effect.gen(function*() {
      const repository = yield* Repository

      const user = yield* repository.createUser({ email: "delete@mail.com", role: "customer" })
      const deletedUser = yield* repository.deleteUser({ userId: user.userId })
      expect(Option.getOrNull(deletedUser)).toMatchObject({ userId: user.userId })
    }))

  it.effect("should create organization", () =>
    Effect.gen(function*() {
      const repository = yield* Repository
      const name = "foo"
      const newOrg = yield* repository.createOrganization({ name })
      expect(newOrg).toMatchObject({ name })

      const deletedOrg = yield* repository.deleteOrganization({ organizationId: newOrg.organizationId })
      expect(Option.getOrNull(deletedOrg)).toMatchObject({ organizationId: newOrg.organizationId })
    }))

  it.effect("should create membership", () =>
    Effect.gen(function*() {
      const repository = yield* Repository
      const organization = yield* repository.createOrganization({ name: "membership-test-org" })
      const owner = yield* repository.createUser({ email: "membership-test-owner@mail.com", role: "customer" })
      const ownerMembership = yield* repository.createMembership({
        organizationId: organization.organizationId,
        userId: owner.userId,
        membershipRole: "owner"
      })
      expect(ownerMembership).toMatchObject({
        organizationId: organization.organizationId,
        userId: owner.userId
      })
      const member = yield* repository.createUser({ email: "membership-test-member@mail.com", role: "customer" })
      const memberMembership = yield* repository.createMembership({
        organizationId: organization.organizationId,
        userId: member.userId,
        membershipRole: "member"
      })
      expect(memberMembership).toMatchObject({
        organizationId: organization.organizationId,
        userId: member.userId
      })
    }))

  it.effect("should get users", () =>
    Effect.gen(function*() {
      const repository = yield* Repository
      const users = yield* repository.getUsers()
      expect(users.length).toBeGreaterThanOrEqual(1)
    }))

  it.effect("should get organization", () =>
    Effect.gen(function*() {
      const repository = yield* Repository
      const organization = yield* repository.getOrganization({ organizationId: 1 })
      console.log(organization)
      expect(Option.getOrNull(organization)).toMatchObject({ organizationId: 1 })
    }))
})
