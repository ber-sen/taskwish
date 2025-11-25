import { UseCase, Message } from "../../src";

export default UseCase("Sub steps")
  .use(import("../package"))

  .on({ user: { name: "string", age: "number" } })

  .steps(
    {
      name: "first",
      run: () => 3,
    },
    
    {
      name: "stream step",
      run: async function* () {
        yield Message.User([
          { type: "text", text: "asd" },
          { type: "text", text: "asdasd" },
        ]);
        yield 2;
        yield 3;
      },
    }
  );
