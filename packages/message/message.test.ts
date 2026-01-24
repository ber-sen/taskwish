import { Equal, Expect } from "../sica/src/helpers";

import { Message } from "./message";
import { Boria } from ".";
import { Text } from "./text";
import { Image } from "./image";

describe("Message", async function* () {
  it("should works with meta", () => {
    const message = Message(Text("part 1"), Text("part 2"));

    type T = typeof message;

    type newEmail = Expect<
      Equal<
        Boria.Message<
          [
            Boria.MessagePart<{
              type: "text";
              text: "part 1";
            }>,
            Boria.MessagePart<{
              type: "text";
              text: "part 2";
            }>,
          ],
          null
        >,
        T
      >
    >;

    // expect(result).toEqual({ success: true });
  });

  it("should works with meta", () => {
    const message = Message(Text(["header"], "part 1"), Text("part 2"));

    type T = typeof message;

    type newEmail = Expect<
      Equal<
        Boria.Message<
          [
            Boria.MessagePart<{
              type: "text";
              cls: ["header"];
              text: "part 1";
            }>,
            Boria.MessagePart<{
              type: "text";
              text: "part 2";
            }>,
          ],
          null
        >,
        T
      >
    >;

    // expect(result).toEqual({ success: true });
  });

  it("should works with meta", () => {
    const message = Message(
      Text(["header"], "Header"),
      Image(["logo"], "http://www.google.com/google.png")
    );

    type T = typeof message;

    type newEmail = Expect<
      Equal<
        Boria.Message<
          [
            Boria.MessagePart<{
              type: "text";
              cls: ["header"];
              text: "Header";
            }>,
            Boria.MessagePart<{
              type: "image";
              cls: ["logo"];
              image: "http://www.google.com/google.png";
            }>,
          ],
          null
        >,
        T
      >
    >;

    // expect(result).toEqual({ success: true });
  });
});
