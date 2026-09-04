import { describe, expect, test } from "bun:test";

import { Step } from "./step";

describe("Step names", () => {
  test.each(["greet", "createCustomer", "step2"])(
    "accepts lower camelCase name %s",
    (name) => {
      expect(() => Step(name, function () {})).not.toThrow();
    },
  );

  test("accepts a lower camelCase pipeline name", () => {
    expect(() => Step(["|>", "transformItems"], function () {})).not.toThrow();
  });

  test.each([
    "CreateCustomer",
    "create-customer",
    "create_customer",
    "create customer",
    "2createCustomer",
    "",
  ])("rejects non-camelCase name %j", (value) => {
    const name: string = value;
    expect(() => Step(name, function () {})).toThrow(
      `Step name "${value}" must use lower camelCase.`,
    );
  });

  test("rejects a non-camelCase pipeline name", () => {
    const name: string = "TransformItems";
    expect(() => Step(["|>", name], function () {})).toThrow(
      'Step name "TransformItems" must use lower camelCase.',
    );
  });

  test("rejects invalid literal names at compile time", () => {
    // oxlint-disable-next-line no-constant-condition -- This block only verifies compile-time errors.
    if (false) {
      // @ts-expect-error Step names must use lower camelCase.
      Step("create-customer", function () {});

      // @ts-expect-error Pipeline step names must use lower camelCase.
      Step(["|>", "TransformItems"], function () {});
    }
  });
});
