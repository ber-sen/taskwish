"use server";

import { Trace, consume, Ctx } from "@taskwish/wire";

export const onGreeterMessage = Object.assign(
  async function onGreeterMessage(input: { name: string; }) {
    return onGreeterMessageCtx().run(input);
  },
  {
    ...onGreeterMessageCtx(),
    ctx: onGreeterMessageCtx,
  },
);

function onGreeterMessageCtx(scope: Ctx = Ctx.new()) {
  scope = Ctx.new(scope);

  async function run(input: { name: string; }) {
    return consume(stream(input));
  }

  async function* stream(input: { name: string; }) {

    yield new Trace("Biller::onGreeterMessage", { input });

    const onGreeterMessage = {
      invoice: `Invoice created from greeter message: ${input.name}`,
    };

    yield new Trace("Biller::onGreeterMessage.onGreeterMessage", { result: onGreeterMessage });

    yield new Trace("Biller::onGreeterMessage", { result: onGreeterMessage });

    return onGreeterMessage;
  }

  return { run, stream };
}
