import { z } from "zod";
import { UseCase, Wait } from "../../src";
import newEmail from "../events/new-email";

export default UseCase("Say hello")
  .use(import("../actions"))

  .on(z.object({ language: z.string() }))

  .describe("Send hello message to slack", {
    input: { language: "Hello language" },
  })

  .steps(
    ["step1", () => 3],

    Wait.until(newEmail),

    ["step2", () => 3]
  );

