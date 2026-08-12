"use server";

import { Trace, consume } from "@taskwish/wire";

export const hello = Object.assign(
  async function hello(input: { name: string; }) {
    return helloCtx().run(input);
  },
  {
    ...helloCtx(),
    ctx: helloCtx,
  },
);

function helloCtx(scope: {} = {}) {

  async function run(input: { name: string; }) {
    return consume(stream(input));
  }

  async function* stream(input: { name: string; }) {
    const signal = (name: string, input: unknown) => new Trace(name, { input });

    yield new Trace("Greeter::hello", { input });

    const notify = signal("Greeter::Message", { name: input.name });

    yield new Trace("Greeter::hello.notify", { result: notify });

    const greet = `Hello ${input.name}`;

    yield new Trace("Greeter::hello.greet", { result: greet });

    yield new Trace("Greeter::hello", { result: greet });

    return greet;
  }

  return { run, stream };
}
