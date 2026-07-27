function normalizeName(name: string) {
  return name.trim();
}

class LoremRunSteps {
  public input: { name: string; };
  declare public firstStep: string;
  declare public lastStep: number;

  constructor(input: { name: string; }) {
    this.input = input;
  }

  #firstStep() {
    return `Hello ${normalizeName(this.input.name)}`;
  }

  #lastStep() {
    return this.firstStep.length;
  }

  async run() {
    this.firstStep = this.#firstStep();

    this.lastStep = this.#lastStep();

    return this.lastStep;
  }
}

export const runSteps = (input: { name: string; }) =>
  new LoremRunSteps(input).run();