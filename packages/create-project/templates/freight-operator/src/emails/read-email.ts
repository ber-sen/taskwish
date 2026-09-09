import { Step } from "taskwish";

import { actor } from "./emails";

export const { readEmail } = actor()
  .on("Command", "readEmail")

  .input({ body: "string" })

  .run(
    Step("readBody", function () {
      const body = this.input.body.trim();
      if (!body || body.length > 120_000)
        throw new Error("Provide 1–120,000 characters of email text.");
      return { markdown: `Email body:\n${body}` };
    })
  )

  .meta({
    description: "Convert a decoded plain-text email body to source Markdown",
    input: {
      body: {
        description: "Decoded plain-text email body",
        example: "Please book load BOL-1042…",
      },
    },
  });
