import { Equal, Expect } from "../helpers";

import { Message } from "../boria/message";
import { Boria } from "../boria";

describe("Message", async function* () {
  it("should works with meta", () => {
    const message = Message("A Message asdasdskajd");

    type T = typeof message;

    type newEmail = Expect<
      Equal<Boria.Message<["A Message asdasdskajd"], null>, T>
    >;

    // expect(result).toEqual({ success: true });
  });
});
