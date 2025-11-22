import { UseCase } from "../../src";

export default UseCase("Simple")
  .use(import("../package"))

  .steps(({ action }) => action.succeed())

  .meta({ description: "Send a message to slack" });
