import { Expect, Equal } from "./helpers";
import { Event } from "./event";
import { Taskwish } from "./types";

describe("Event", async function* () {
  it("works with arrow functions", () => {
    const newEmail = Event("new-email").data({
      from: "string",
      subject: "string",
    });

    type T = typeof newEmail;

    type newEmail = Expect<
      Equal<
        Taskwish.EventKind<
          {
            from: string;
            subject: string;
          },
          ["event", "new-email"],
          null
        >,
        T
      >
    >;

    const test = async function* () {
      const res = yield* newEmail.dispatch({ from: "lorem@ipsum.com", subject: "Hi" });

      return res;
    };

    // expect(result).toEqual({ success: true });
  });
});
