// import tsEvent from "../events/ts-event";

import { Message, Actor } from "../src";

export default Actor("AutoReplay")
  .use(import("@taskwish/slack"))

  .on("slack.NewMessage", {
      user: "U05KMUK39UJ",
      channel: "#general",
  })
  
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
