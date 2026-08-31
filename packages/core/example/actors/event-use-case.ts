import { Actor } from "../../src";

export default Actor("SayHello")
  .use(import("../package"))

  .on("zod-new-email")

  .steps({
    name: "asdasd",
    run: ($) => $.input,
  })

  .meta({
    description: "Send hello message to Slack",
  });

type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (
  x: infer I
) => void
  ? I
  : never;

// Turn a union into an overloaded function, then extract its parameter tuple
type UnionToTuple<U> = UnionToIntersection<
  U extends any ? (x: U) => void : never
> extends (x: infer I) => void
  ? [...UnionToTuple<Exclude<U, I>>, I]
  : [];

// Count the number of keys
type KeyCount<T> = UnionToTuple<keyof T>["length"];

type _Zero = KeyCount<{}>; // 0
type _One = KeyCount<{ a: 1 }>; // 1
type _Two = KeyCount<{ a: 1; b: 2 }>; // 2
