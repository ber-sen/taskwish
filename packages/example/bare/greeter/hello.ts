"use server";

import { Wire, createScope } from "@taskwish/wire";

interface HelloAction {
  (input: { name: string; }): Promise<string>;
  run(input: { name: string; }): Promise<string>;
  stream(input: { name: string; }): Promise<string>;
  ctx: typeof helloCtx;
}

export const hello: HelloAction = Object.assign(
  async function hello(input: { name: string; }) {
    return helloCtx().run(input);
  },
  {
    run: helloCtx().run,
    stream: helloCtx().stream,
    ctx: helloCtx,
  },
);

function helloCtx(ctx = {}) {
  const wire = new Wire();
  const initialScope = { wire };
  const scope: typeof initialScope = createScope(initialScope, ctx);

  async function run(input: { name: string; }) {
    return stream(input);
  }

  async function stream(input: { name: string; }) {

    scope.wire.trace("Greeter::hello", { input });

    const notify = scope.wire.signal("Greeter::Message", { name: input.name }) as Record<string, unknown>;

    scope.wire.trace("Greeter::hello.notify", { result: notify });

    const greet = `Hello ${input.name}`;

    scope.wire.trace("Greeter::hello.greet", { result: greet });

    scope.wire.trace("Greeter::hello", { result: greet });

    return greet;
  }

  return { run, stream };
}