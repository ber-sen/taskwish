import { Message, Actor, Step, Boria } from "../../src";
// import tsEvent from "../events/ts-event";

export default Actor("IO")
  .use(import("../package"))

  .on(Message<[Boria.MessagePart<{ type: number }>]>)

  .handler(
    Step("lorem", function () {
      return this.input;
    }),
    // {
    //   name: "response",
    //   run: ({ ai, input }) =>
    //     ai.generateText({
    //       system: "Generate response for the message",
    //       model: "gtp-4",
    //       prompt: input.content,
    //     }),
    // },

    // ({ response }) => Message(Text(response))
  );
