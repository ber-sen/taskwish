import { UseCase } from "../../src";

export default UseCase("Simple")
  .use(import("../package"))

  .steps(
    {
      name: "test",
      run: () => 3,
    },
    
    {
      name: "lorem ipsum",
      run: ({ test }) => test,
    }
  )

  .meta({ description: "Send a message to slack" });
