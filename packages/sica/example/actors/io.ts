import { Message, Actor } from "../../src";
import { Text } from "../../src/boria/text";
// import tsEvent from "../events/ts-event";

export default Actor("IO")
  .use(import("../package"))

  .on(Message)

  .steps(
    {
      name: "response",
      run: ({ ai, input }) =>
        ai.generateText({
          system: "Generate response for the message",
          model: "gtp-4",
          prompt: input.content,
        }),
    },

    ({ response }) => Message(Text(response))
  );
