import { Actor, Step } from "taskwish";

function normalizeName(name: string) {
  return name.trim();
}

const { Lorem } = Actor("Lorem");

export const { runSteps } = Lorem()
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

const main = async () => {
  const result = await runSteps({ name: "hello" });

  console.log(result);
};

main();
