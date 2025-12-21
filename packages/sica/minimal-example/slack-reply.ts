// import tsEvent from "../events/ts-event";

import { Message, Actor } from "../src";

export default Actor("AutoReplay")
  .on(Message)

  .steps(
    {
      name: "response",
      run: ({ input, agent }) =>
        agent.generateText({
          model: "gtp-4",
          messages: input.messages,
        }),
    },

    ({ response }) => Forward(response).to("Identity"),

    ({ response }) => Reply(response)
  );
