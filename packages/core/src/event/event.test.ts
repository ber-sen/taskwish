import { Expect, Equal } from "../helpers";
import { Event } from "./event";
import { TW } from "../core";

describe("Event", async function* () {
  it("works with arrow functions", () => {
    const emailSent = Event("emailSent").data({
      from: "string",
      subject: "string",
    });

    type T = typeof emailSent;

    type newEmail = Expect<
      Equal<
        TW.EventKind<
          "emailSent",
          {
            from: string;
            subject: string;
          },
          null
        >,
        T
      >
    >;

    const test = async function* () {
      const res = yield* newEmail.dispatch({
        from: "lorem@ipsum.com",
        subject: "Hi",
      });

      return res;
    };

    // expect(result).toEqual({ success: true });
  });
});
