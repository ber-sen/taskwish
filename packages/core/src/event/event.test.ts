import { expect, test } from "bun:test";
import { Expect, Equal } from "../helpers";
import { Event } from "./event";
import { TW } from "../core";

test("works with arrow functions", () => {
  const { EmailSent } = Event("EmailSent").data({
    from: "string",
    subject: "string",
  });

  type T = typeof EmailSent;

  type newEmail = Expect<
    Equal<
      TW.EventKind<
        "EmailSent",
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
    const res = yield* EmailSent.emit({
      from: "lorem@ipsum.com",
      subject: "Hi",
    });

    return res;
  };

  // expect(result).toEqual({ success: true });
});
