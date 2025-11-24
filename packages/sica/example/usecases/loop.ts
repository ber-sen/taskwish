import { Loop, End, Range, UseCase, Message } from "../../src";

export default UseCase("Say hello")
  .use(import("../package"))

  .on({ user: { name: "string", age: "number" } })

  .steps(
    Loop(Range(0, 10)),

    {
      name: "asdas",
      type: "slack::SendMessage",
      run: () => ({ channel: "#general", text: "asdasd" }),
    },

    Message("Message send to slack"),

    End(Loop)
  );
