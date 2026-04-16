import { Step, TWActor } from "../../src";

class Lorem extends TWActor<"Lorem"> {
  constructor() {
    super("Lorem");
  }

  greet(name: string) {
    return this.run(
      Step("Name", function () {
        return name;
      }),

      Step("Mid step", function () {
        return `Bye ${this.name}`;
      }),

      Step("Last step", function () {
        return this.midStep;
      }),
    );
  }
}
