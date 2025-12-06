import { Equal, Expect } from "../helpers";

import { Message } from "../boria/message";
import { Boria } from "../boria";
import { Text } from "./parts";

describe("Message", async function* () {
  it("should works with meta", () => {
    const message = Message(Text("part 1"), Text("part 2"));

    type T = typeof message;

    type newEmail = Expect<
      Equal<
        Boria.Message<
          [
            {
              type: "text";
              text: "part 1";
            },
            {
              type: "text";
              text: "part 2";
            },
          ],
          null
        >,
        T
      >
    >;

    // expect(result).toEqual({ success: true });
  });
});
