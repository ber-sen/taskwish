import { Equal, Expect } from "./helpers";
import { Actor } from "./simple-actor";
import { Taskwish } from "./types";

describe("Actor", () => {
  it("works as caller", async () => {
    const { greeter } = Actor("Greeter").handler(function () {
      return { success: true };
    });

    type T = typeof greeter;

    type succeed = Expect<
      Equal<
        Taskwish.Action<
          "Greeter",
          () => Promise<{
            success: boolean;
          }>,
          null
        >,
        T
      >
    >;

    const result = await greeter();

    expect(result).toEqual({ success: true });
  });

  it("works with with input", async () => {
    const { greeter } = Actor("Greeter")
      .on({ hello: "string" })

      .handler(function () {
        return `Hello ${this.hello}`;
      });

    type T = typeof greeter;

    type succeed = Expect<
      Equal<
        Taskwish.Action<
          "Greeter",
          (input: { hello: string }) => Promise<string>,
          null
        >,
        T
      >
    >;

    const result = await greeter({ hello: "World" });

    expect(result).toEqual({ success: true });
  });
});
