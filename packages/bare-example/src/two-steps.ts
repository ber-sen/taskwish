import { Actor, Step } from "taskwish";

function normalizeName(name: string) {
  return name.trim();
}

const { lorem } = Actor("Lorem");

export const { runSteps } = lorem()
  .on("Command", "runSteps")

  .input({ name: "string" })

  .run(
    Step("firstStep", function () {
      return `Hello ${normalizeName(this.input.name)}`;
    }),

    Step("lastStep", function () {
      return this.firstStep.length;
    }),
  );

export const { Lorem } = lorem().service({ runSteps });

const main = async () => {
  const result = await Lorem.runSteps({ name: "hello" });

  console.log(result);
};

main();
