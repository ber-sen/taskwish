import { Else, Actor, If, Step } from "../../src";

interface Input {
  <T>(input: { name: 3 }): T;
}

export default Actor("Greeding")
  .use(import("../package"))

  .on<Input>("lorem ipsum")

  .run(
    If(
      () => 2 > 1,

      Step("getName", function () {
        return this.input.user.name;
      }),
    ),
    Else(
      Step("getName", function () {
        return this.input.user.name;
      }),
    ),
  );
