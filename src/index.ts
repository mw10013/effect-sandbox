import { Console, Effect } from "effect"
import { Repository } from "./Repository.js"

const program = Effect.gen(function*() {
  const repository = yield* Repository
  yield* repository.setUp()
  const user = yield* repository.createUser({ email: "foo@mail.com", role: "customer" })
  yield* Console.log({ user })
  yield* Console.log(yield* repository.getUsers())
  yield* repository.updateUserEmail({ email: "bar@mail.com", userId: 1 })
  yield* Console.log(yield* repository.getUsers())
})

const runnable = Effect.provide(program, Repository.Default)

Effect.runPromiseExit(runnable).then(console.log)
