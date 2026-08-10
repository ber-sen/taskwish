function normalizeName(name: string) {
  return name.trim();
}

export async function greet(input: { name: string }) {
  return run_greet({ input });
}

async function run_greet(params: {
  input: { name: string };
  trace?: (data: unknown) => void;
}) {
  const trace =
    params.trace ?? ((data: unknown) => console.log(JSON.stringify(data)));

  const input = params.input;

  trace({ ">>": "Greeter", input: input });

  const salutation = Math.random() > 0.5 ? "Hello" : "HI";

  trace({ ">>": "Greeter::greet", result: salutation });

  const greet = `${salutation} ${normalizeName(input.name)}.`;

  trace({ ">>": "Greeter", result: greet });

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
