import { UseCase } from "../../src";

export default UseCase("Simple")
  .use(import("../package"))

  .describe({ description: "Send a message to slack" })

  .steps(({ action }) => action.succeed());
