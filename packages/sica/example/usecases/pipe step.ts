import { UseCase } from "../../src";

export default UseCase("Sub steps")
  .use(import("../package"))

  .on({ user: { name: "string", age: "number" } })

  .steps(
    ({ input }) =>
      Step("asdads")
        .run(async function* () {
          yield Message.User([
            { type: "text", text: "asd" },
            { type: "text", text: "asdasd" },
          ]);
          yield 2;
          yield 3;
        })
        .pipe(Source.pipeTo(Response)),

    ({ action, input }) =>
      Step("asdads")
        .run(
          action.slack.sendMessage({
            channel: "#general",
            text: `Does someone speak ${input.language}?`,
          })
        )
        .pipe(Source.pipeTo(Response))
  );
