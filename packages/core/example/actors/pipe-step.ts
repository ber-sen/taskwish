import { Message, Source, Actor } from "../../src";

export default Actor("Sub steps")
  .use(import("../package"))

  .on({ user: { name: "string", age: "number" } })

  .steps(
    {
      name: "lorem ipsum",
      options: [Source.pipeTo(Response)],

      run: async function* () {
        yield Message([
          { type: "text", text: "asd" },
          { type: "text", text: "asdasd" },
        ]);
        yield 2;
        yield 3;
      },
    },

    {
      name: "asdads",
      run: ({ action, input }) =>
        action.slack.sendMessage({
          channel: "#general",
          text: `Does someone speak ${input.user.name}?`,
        }),
    }
  );
