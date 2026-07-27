function normalizeName(name: string) {
  return name.trim();
}

class LoremRunSteps {
  public input: { name: string; };
  public firstStep!: string;
  public lastStep!: number;

  constructor(input: { name: string; }) {
    this.input = input;
  }

  async #firstStep() {
    return `Hello ${normalizeName(this.input.name)}`;
  }

  async #lastStep() {
    return this.firstStep.length;
  }

  async run() {
    this.firstStep = await this.#firstStep();

    this.lastStep = await this.#lastStep();

    return this.lastStep;
  }
}

export const runSteps = (input: { name: string; }) =>
  new LoremRunSteps(input).run();