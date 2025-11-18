import { Expect, Equal } from "./helpers";
import { Event } from "./event";
import { Sica } from "./types";

describe("Event", async function* () {
  it("works with arrow functions", () => {
    const newEmail = Event("new-email")
      .data({
        from: "string",
        subject: "string",
      })
      .thread("from");

    type T = typeof newEmail;

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
