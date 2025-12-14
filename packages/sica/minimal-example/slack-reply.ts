// import tsEvent from "../events/ts-event";

import { Message, UseCase } from "../src";

export default UseCase("AutoReplay")
  .use(import("@taskwish/slack"))

  .on(({ slack }) =>
    slack.NewMessage({
      user: "U05KMUK39UJ",
      channel: "#general",
    })
  )

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
