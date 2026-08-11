import { Trace, consume } from "@taskwish/wire";

("use server");

export async function hello(input: { name: string }) {
  return consume(stream_hello({ input }));
}

export async function run_hello(params: { input: { name: string } }) {
  return consume(stream_hello(params));
}

export async function* stream_hello(params: { input: { name: string } }) {
  const input = params.input;
  const signal = (name: string, input: unknown) => new Trace(name, { input });

  yield new Trace("Greeter::hello", { input });

  const notify = signal("Greeter::Message", { name: input.name });

  yield new Trace("Greeter::hello.notify", { result: notify });

  const greet = `Hello ${input.name}`;

  yield new Trace("Greeter::hello.greet", { result: greet });

  yield new Trace("Greeter::hello", { result: greet });

  return greet;
}
