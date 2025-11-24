import { UseCase } from "../../src";

export default UseCase("Sub steps")
  .use(import("../package"))

  .on({ user: { name: "string", age: "number" } })

  .steps(
    {
      name: "lorem ipsum",
      run: async function* () {
        yield Message.User([
          { type: "text", text: "asd" },
          { type: "text", text: "asdasd" },
        ]);
        yield 2;
        yield 3;
      },
      options: [Source.pipeTo(Response)],
    },

    {
      name: "asdads",
      type: ["slack.send-message"],
      run: ({ input }) => ({
        channel: "#general",
        text: `Does someone speak ${input.user.age}?`,
      }),
    }
  );
