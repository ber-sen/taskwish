import { Else, Actor, If, Step } from "../../src";

interface Input {
  <T>(input: { name: 3 }): T;
}

export default Actor("Greeding")
  .use(import("../package"))

  .on<Input>("lorem ipsum")

  .handler(
    If(
      () => 2 > 1,

      Step("get name", function () {
        return this.input.user.name;
      }),
    ),
    Else(
      Step("get name", function () {
        return this.input.user.name;
      }),
    ),
  );
