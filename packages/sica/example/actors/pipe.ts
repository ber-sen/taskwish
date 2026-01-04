import { Actor, Message } from "../../src";

export default Actor("Sub steps")
  .use(import("../package"))

  .on({ user: { name: "string", age: "number" } })

  .steps(
    {
      name: "first",
      run: ($) => $.input,
    },
    
    {
      name: "stream step",
      run: async function* () {
        yield Message([
          { type: "text", text: "asd" },
          { type: "text", text: "asdasd" },
        ]);
        yield 2;
        yield 3;
      },
    }
  );
