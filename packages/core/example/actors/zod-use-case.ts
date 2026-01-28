import { z } from "zod";
import { Actor, Step } from "../../src";

export default Actor("Say hello")
  .use(import("../package"))

  .on(z.object({ language: z.string() }))

  .run(
    Step("first step", function () {
      return this.action.slack.sendMessage({
        channel: "#general",
        message: this.input.language,
      });
    })
  )

  .meta({
    description: "asdasd",
    input: { language: "Hello language" },
  });

type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (
  x: infer I
) => void
  ? I
  : never;

// Turn a union into an overloaded function, then extract its parameter tuple
type UnionToTuple<U> =
  UnionToIntersection<U extends any ? (x: U) => void : never> extends (
    x: infer I
  ) => void
    ? [...UnionToTuple<Exclude<U, I>>, I]
    : [];

// Count the number of keys
type KeyCount<T> = UnionToTuple<keyof T>["length"];

type Zero = KeyCount<{}>; // 0
type One = KeyCount<{ a: 1 }>; // 1
type Two = KeyCount<{ a: 1; b: 2 }>; // 2
