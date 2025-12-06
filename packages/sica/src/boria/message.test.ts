import { Equal, Expect } from "../helpers";

import { Message } from "../boria/message";
import { Boria } from "../boria";
import { Text } from "./text";

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

  it("should works with meta", () => {
    const message = Message(Text(["header"], "part 1"), Text("part 2"));

    type T = typeof message;

    type newEmail = Expect<
      Equal<
        Boria.Message<
          [
            {
              type: "text";
              cls: ["header"];
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

  // it("should works with meta", () => {
  //   const message = Message(
  //     Text(["header"], "asdasd"),
  //     Image(["logo"], "http://www.google.com/google.png"),
  //     HStack(["cta"], Image("http://www.google.com/google.png"), Text("asdad"))
  //   );

  //   type T = typeof message;

  //   type newEmail = Expect<
  //     Equal<
  //       Boria.Message<
  //         [
  //           {
  //             type: "image";
  //             image: "http://www.google.com/google.png";
  //           },
  //           {
  //             type: "text";
  //             text: "part 2";
  //           },
  //         ],
  //         null
  //       >,
  //       T
  //     >
  //   >;

  //   // expect(result).toEqual({ success: true });
  // });
});
