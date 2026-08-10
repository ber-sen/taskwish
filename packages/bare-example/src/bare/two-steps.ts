function normalizeName(name: string) {
  return name.trim();
}

export async function greet(input: { name: string }) {
  return run_greet({ input });
}

async function run_greet(params: { input: { name: string } }) {
  const input = params.input;

  const salutation = Math.random() > 0.5 ? "Hello" : "HI";

  const greet = `${salutation} ${normalizeName(input.name)}.`

  return greet;
}

export const Greeter = {
  greet,
  run: {
    greet: run_greet,
  },
};

const main = async () => {
  const result = await Greeter.run.greet({ input: { name: "World" } });

  console.log(result);
};

main();
