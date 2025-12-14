import { Actor } from "../../src";
// import tsEvent from "../events/ts-event";

export default Actor("Chat bot")
  .use(import("../package"))

  .on({ tools: "string[]", prompt: "string" })

  .steps(
    {
      name: "tools",
      run: ({ input, tools }) =>
        tools.filter((tool) => input.tool.includes(tool.name)),
    },

    {
      name: "marketing agent",
      run: ({ agent, tools }) =>
        agent.new({
          system: "asdasdadas asdas da",
          model: "gtp-4",
          tools: tools,
        }),
    },

    {
      name: "response",
      run: ({ agent, input }) =>
        agent.marketingAgent({
          prompt: input.prompt,
        }),
    }
  );
