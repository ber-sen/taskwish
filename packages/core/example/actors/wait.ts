import { z } from "zod";
import { Actor, Wait } from "../../src";
import newEmail from "../events/new-email";

export default Actor("Say hello")
  .use(import("../package"))

  .on(z.object({ language: z.string() }))

  .steps(
    { name: "Step 1", run: () => 3 },

    Wait.until(newEmail),

    { name: "step2", run: ($) => $.step1 }
  )

  .meta({
    input: { language: "Hello language" },
  });
