import { expect, test } from "bun:test";

import { Greeter } from "../src/greeter";

test("greets a person by name", async () => {
  expect(await Greeter.greet({ name: "  Ada  " })).toBe("Hello, Ada!");
});
