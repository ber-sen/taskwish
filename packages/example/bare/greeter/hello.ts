"use server";

import { Trace, consume } from "@taskwish/wire";

export async function hello(input: { name: string; }) {
  return consume(helloStream({ input }));
}

export async function helloRun(params: {
  input: { name: string; };
}) {
  return consume(helloStream(params));
}

export async function* helloStream(params: {
  input: { name: string; };
}) {
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