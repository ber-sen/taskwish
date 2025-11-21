import { Equal, Expect } from "../helpers";

import { Message } from "../boria/message";
import { Boria } from "../boria";

describe("Message", async function* () {
  it("should works with meta", () => {
    const message = Message("A Message asdasdskajd").attr({
      redirectThreadId: "cde8902f-0b07-5fcb-80f5-3fa809508db4",
    });

    type T = typeof message;

    type newEmail = Expect<
      Equal<
        Boria.Message<
          {
            role: "assistant";
            content: "A Message asdasdskajd";
          },
          {
            redirectThreadId: "cde8902f-0b07-5fcb-80f5-3fa809508db4";
          }
        >,
        T
      >
    >;

    // expect(result).toEqual({ success: true });
  });
});
