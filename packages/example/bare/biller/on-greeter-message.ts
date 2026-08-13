"use server";

import { Wire, createScope } from "@taskwish/wire";

interface OnGreeterMessageAction {
  (input: { name: string; }): Promise<{ invoice: string; }>;
  run(input: { name: string; }): Promise<{ invoice: string; }>;
  stream(input: { name: string; }): Promise<{ invoice: string; }>;
  ctx: typeof onGreeterMessageCtx;
}

export const onGreeterMessage: OnGreeterMessageAction = Object.assign(
  async function onGreeterMessage(input: { name: string; }) {
    return onGreeterMessageCtx().run(input);
  },
  {
    run: onGreeterMessageCtx().run,
    stream: onGreeterMessageCtx().stream,
    ctx: onGreeterMessageCtx,
  },
);

function onGreeterMessageCtx(ctx = {}) {
  const wire = new Wire({ threadId: "main", log: "console" });
  const initialScope = { wire };
  const scope: typeof initialScope = createScope(initialScope, ctx);

  async function run(input: { name: string; }) {
    return stream(input);
  }

  async function stream(input: { name: string; }) {

    scope.wire.trace("Biller::onGreeterMessage", { input });

    const onGreeterMessage = {
      invoice: `Invoice created from greeter message: ${input.name}`,
    };

    scope.wire.trace("Biller::onGreeterMessage.onGreeterMessage", { result: onGreeterMessage });

    scope.wire.trace("Biller::onGreeterMessage", { result: onGreeterMessage });

    return onGreeterMessage;
  }

  return { run, stream };
}