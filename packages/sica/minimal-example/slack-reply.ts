// import tsEvent from "../events/ts-event";

import { Message, Actor } from "../src";

export default Actor("AutoReplay")
  .on(Message)

  .steps(
    {
      name: "response",

      run: ({ event, agent }) =>
        agent.generateText({
          model: "gtp-4",
          messages: event.io.messages,
        }),
    },

    Forward(response).to("Identity"),

    {
      run: ({ response }) => Reply(response),
      needsApproval: true,
    }
  );
