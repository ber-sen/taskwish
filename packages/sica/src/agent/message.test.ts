import { Sica } from "../types";
import { Message } from "./message";

describe("Message", async function* () {
  it("should works with meta", () => {
    const message = Message("A Message asdasdskajd").attr({
      threadId: "asdasd",
    });

    type T = typeof message;

    type newEmail = Expect<
      Equal<
        Sica.EventKind<
          {
            from: string;
            subject: string;
          },
          ["event", "new-email", ":@from"]
        >,
        T
      >
    >;

    const test = async function* () {
      const res = yield* newEmail({ from: "lorem@ipsum.com", subject: "Hi" });

      return res.handled;
    };

    // expect(result).toEqual({ success: true });
  });
});
