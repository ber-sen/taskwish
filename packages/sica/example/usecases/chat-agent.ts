import { Message, UseCase } from "../../src";
// import tsEvent from "../events/ts-event";

export default UseCase("Chat bot")
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
      type: "agent",
      init: () => ({
        model: "gtp-4",
      }),
    },

    {
      name: "response",
      type: "marketingAgent",
      run: ({ tools }) => ({
        prompt: "asdasd",
      }),
    }
  );
