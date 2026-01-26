import { Actor, Step } from "../../src";
// import tsEvent from "../events/ts-event";

export default Actor("Chat bot")
  .use(import("../package"))

  .on({ tools: "string[]", prompt: "string" })

  .steps(
    Step("tools").run(({ input, tools }) =>
      tools.filter((tool) => input.tool.includes(tool.name))
    ),

    Step("marketing agent").run(({ ai, tools }) =>
      ai.agent.new({
        system: "asdasdadas asdas da",
        model: "gtp-4",
        tools: tools,
      })
    ),

    Step("response").run(({ ai }) =>
      ai.agent.marketingAgent({
        prompt: input.prompt,
      })
    )
  );
