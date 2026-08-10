import { Actor, Step } from "taskwish";

function normalizeName(name: string) {
  return name.trim();
}

const { greeter } = Actor("Greeter");

export const { greet } = greeter()
  .on("Command", "greet")

  .input({ name: "string" })

  .run(
    Step("salutation", function () {
      return "Hello";
    }),

    Step("greet", function () {
      return `${this.salutation} ${normalizeName(this.input.name)}.`
    }),
  );

export const { Greeter } = greeter().service({ greet });

const main = async () => {
  const start = performance.now()
  const result = await Greeter.greet({ name: "World" });
  const end = performance.now()

  console.log(result);
  console.log(end - start);
};

main();
