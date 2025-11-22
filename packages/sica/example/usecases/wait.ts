import { z } from "zod";
import { UseCase, Wait } from "../../src";
import newEmail from "../events/new-email";

export default UseCase("Say hello")
  .use(import("../package"))

  .on(z.object({ language: z.string() }))

  .steps(
    ["step1", () => 3],

    Wait.until(newEmail),

    ["step2", () => 3]
  )

  .attr({
    input: { language: "Hello language" },
  });
