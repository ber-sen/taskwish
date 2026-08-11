import { Trace, consume } from "@taskwish/wire";

function normalizeName(name: string) {
  return name.trim();
}

export async function greet(input: { name: string; }) {
  return consume(stream_greet({ input }));
}

async function run_greet(params: {
  input: { name: string; };
}) {
  return consume(stream_greet(params));
}

async function* stream_greet(params: {
  input: { name: string; };
}) {
  const input = params.input;

  yield new Trace("Greeter::greet", { input });

  const salutation = "Hello";

  yield new Trace("Greeter::greet.salutation", { result: salutation });

  const greet = `${salutation} ${normalizeName(input.name)}.`;

  yield new Trace("Greeter::greet.greet", { result: greet });

  yield new Trace("Greeter::greet", { result: greet });

  return greet;
}

export const Greeter = {
  greet,
  run: {
    greet: run_greet
  },
  stream: {
    greet: stream_greet
  }
};

const main = async () => {
  const start = performance.now()
  const result = await Greeter.greet({ name: "World" });
  const end = performance.now()

  console.log(result);
  console.log(end - start);
};

main();