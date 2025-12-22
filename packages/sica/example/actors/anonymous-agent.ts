import { Actor } from "../../src";
// import tsEvent from "../events/ts-event";

export default Actor("ChatBot")
  .use(import("../package"))

  .on({ tools: "string[]", prompt: "string" })

  .steps(
    {
      name: "tools",
      run: ({ input, tools }) =>
        tools.filter((tool) => input.tool.includes(tool.name)),
    },

    {
      name: "response",
      run: ({ agent, tools }) =>
        agent.generateText({
          system: "asdasdadas asdas da",
          model: "gtp-4",
          tools: tools,
          prompt: input.prompt,
        }),
    }
  );


