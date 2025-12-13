import { Message, NewMessage, UseCase } from "../../src";
import { Text } from "../../src/boria/text";
// import tsEvent from "../events/ts-event";

export default UseCase("IO")
  .use(import("../package"))

  .on(NewMessage)

  .steps(
    {
      name: "response",
      run: ({ agent, input }) =>
        agent.generateText({
          system: "Generate response for the message",
          model: "gtp-4",
          prompt: input.content,
        }),
    },

    ({ response }) => Message(Text(response))
  );
