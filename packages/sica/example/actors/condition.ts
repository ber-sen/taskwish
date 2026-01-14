import { Else, Actor, If,  Step } from "../../src";

export default Actor("Greeding")
  .use(import("../package"))

  .on({ user: { name: "string", age: "number" } })

  .handler(
    If(
      () => 2 > 1,
      
      Step("get name", function () {
        return this.input.user.name;
      })
    ),
    Else(
      Step("get name", function () {
        return this.input.user.name;
      })
    )
  );
