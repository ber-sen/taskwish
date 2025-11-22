import { UseCase } from "../../src";

export default UseCase("Simple")
  .use(import("../package"))

  .steps(({ action }) => action.succeed())

  .attr({ description: "Send a message to slack" });
