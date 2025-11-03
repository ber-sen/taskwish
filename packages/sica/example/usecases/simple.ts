import { UseCase } from "../../src";

export default UseCase("Simple")
  .use(import("../app"))

  .describe({ description: "Send a message to slack" })

  .steps(({ action }) => action.succeed());
