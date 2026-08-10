function normalizeName(name: string) {
  return name.trim();
}

export async function greet(input: { name: string }) {
  const generator = stream_greet({ input });

  while (true) {
    const next = await generator.next();

    if (next.done) {
      return next.value;
    }
  }
}

export async function run_greet(params: {
  input: { name: string };
  trace?: (data: unknown) => void;
}) {
  const generator = stream_greet(params);

  while (true) {
    const next = await generator.next();

    if (next.done) {
      return next.value;
    }
  }
}

async function* stream_greet(params: {
  input: { name: string };
  trace?: (data: unknown) => void;
}) {
  const input = params.input;

  yield { ">>": "Greeter", input: input };

  const salutation = Math.random() > 0.5 ? "Hello" : "HI";

  yield { ">>": "Greeter::greet", result: salutation };

  const greet = `${salutation} ${normalizeName(input.name)}.`;

  yield { ">>": "Greeter", result: greet };

  return greet;
}

export const Greeter = {
  greet,
  run: {
    greet: run_greet,
  },
  stream: {
    greet: stream_greet,
  },
};

const main = async () => {
  const result = await Greeter.run.greet({ input: { name: "World" } });

  console.log(result);
};

main();
