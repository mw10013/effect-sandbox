import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import type { ParseOptions } from "effect/SchemaAST"
import { assert, describe, expect, it } from "vitest"

describe("String", () => {
  const schema = S.String
  it("decoding", async () => {
    await expectDecodeUnknownSuccess(schema, "a", "a")
    await expectDecodeUnknownFailure(schema, 1, "Expected string, actual 1")
  })

  it("encoding", async () => {
    await expectEncodeSuccess(schema, "a", "a")
  })
})

export const expectDecodeUnknownSuccess = async <A, I>(
  schema: S.Schema<A, I, never>,
  input: unknown,
  expected: A = input as any,
  options?: ParseOptions
) => expectSuccess(S.decodeUnknown(schema)(input, options), expected)

export const expectDecodeUnknownFailure = async <A, I>(
  schema: S.Schema<A, I, never>,
  input: unknown,
  message: string,
  options?: ParseOptions
) => expectFailure(S.decodeUnknown(schema)(input, options), message)

export const expectEncodeSuccess = async <A, I>(
  schema: S.Schema<A, I, never>,
  a: A,
  expected: unknown,
  options?: ParseOptions
) => expectSuccess(S.encode(schema)(a, options), expected)

export const expectEncodeFailure = async <A, I>(
  schema: S.Schema<A, I, never>,
  a: A,
  message: string,
  options?: ParseOptions
) => expectFailure(S.encode(schema)(a, options), message)

export const expectSuccess = async <E, A>(
  effect: Either.Either<A, E> | Effect.Effect<A, E>,
  a: A
) => {
  if (Either.isEither(effect)) {
    expectEitherRight(effect, a)
  } else {
    expectEffectSuccess(effect, a)
  }
}

export const expectFailure = async <A>(
  effect: Either.Either<A, ParseResult.ParseError> | Effect.Effect<A, ParseResult.ParseError>,
  message: string
) => {
  if (Either.isEither(effect)) {
    expectEitherLeft(effect, message)
  } else {
    expectEffectFailure(effect, message)
  }
}

export const expectEitherLeft = <A>(e: Either.Either<A, ParseResult.ParseError>, message: string) => {
  if (Either.isLeft(e)) {
    expect(ParseResult.TreeFormatter.formatErrorSync(e.left)).toStrictEqual(message)
  } else {
    console.log(e.right)
    assert.fail(`expected a Left`)
  }
}

export const expectEitherRight = <E, A>(e: Either.Either<A, E>, a: A) => {
  if (Either.isRight(e)) {
    expect(e.right).toStrictEqual(a)
  } else {
    console.log(e.left)
    assert.fail(`expected a Right`)
  }
}

export const expectEffectFailure = async <A>(
  effect: Effect.Effect<A, ParseResult.ParseError>,
  message: string
) => {
  expect(await Effect.runPromise(Effect.either(Effect.mapError(effect, ParseResult.TreeFormatter.formatErrorSync))))
    .toStrictEqual(
      Either.left(message)
    )
}

export const expectEffectSuccess = async <E, A>(effect: Effect.Effect<A, E>, a: A) => {
  expect(await Effect.runPromise(Effect.either(effect))).toStrictEqual(
    Either.right(a)
  )
}
