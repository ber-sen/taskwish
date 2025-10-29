import { z } from "zod";
import { Options, UseCase } from "../../src";

export default UseCase("Say hello")
  .use(import("../actions"))

  .on(z.object({ language: z.string() }))

  .describe("Send hello message to slack", {
    input: { language: "Hello language" },
  })

  .steps(
    ["asdasd", ({ input }) => input],

    ({ asdasd, action }) =>
      action.slack.sendMessage({
        channel: "#general",
        text: `Does someone speak ${asdasd.language}?`,
      }),
  );
