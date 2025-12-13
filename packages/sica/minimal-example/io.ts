// import tsEvent from "../events/ts-event";

import { Message, NewMessage, UseCase } from "../src";

export default UseCase("IO")
  .on(NewMessage)

  .steps(
    {
      name: "response",
      run: ({ agent, input }) =>
        agent.generateText({
          model: "gtp-4",
          messages: input.messages,
        }),
    },

    ({ response }) => Message(response).to("Identity"),

    ({ response }) => Message(response)
  );
