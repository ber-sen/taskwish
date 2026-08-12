import { describe, expect, test } from "bun:test";

import { mergeScope, type PartialScope } from "./scope";

type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <
  T,
>() => T extends Y ? 1 : 2
  ? true
  : false;

describe("scope", () => {
  test("mergeScope recursively patches action groups", async () => {
    const browse = async ({ url }: { url: string }) => `real:${url}`;
    const close = async () => "closed";
    const browseMock = async ({ url }: { url: string }) => `mock:${url}`;
    const initial = {
      actions: {
        browser: {
          browse,
          close,
        },
      },
    };
    const partial: PartialScope<typeof initial> = {
      actions: {
        browser: {
          browse: browseMock,
        },
      },
    };

    const merged = mergeScope(initial, partial);

    type check = Expect<Equal<typeof merged, typeof initial>>;
    expect(await merged.actions.browser.browse({ url: "https://example.com" }))
      .toBe("mock:https://example.com");
    expect(merged.actions.browser.close).toBe(close);
  });

  test("mergeScope ignores undefined patch values", () => {
    const initial = {
      actions: {
        oneAction: () => "real",
      },
    };

    const merged = mergeScope(initial, {
      actions: {
        oneAction: undefined,
      },
    });

    type check = Expect<Equal<typeof merged, typeof initial>>;
    expect(merged.actions.oneAction()).toBe("real");
  });

  test("mergeScope infers its result from the initial scope", () => {
    type Scope = {
      actions: {
        browser: {
          browse: (input: { url: string }) => string;
        };
      };
    };
    const initial: Scope = {
      actions: {
        browser: {
          browse: ({ url }) => url,
        },
      },
    };

    function ctx(scopePatch: PartialScope<Scope> = {}) {
      return mergeScope(initial, scopePatch);
    }

    const scope = ctx();

    type check = Expect<Equal<typeof scope, Scope>>;
    expect(scope.actions.browser.browse({ url: "https://example.com" })).toBe(
      "https://example.com",
    );
  });
});
