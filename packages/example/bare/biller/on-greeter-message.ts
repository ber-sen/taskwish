"use server";

import { Trace, consume } from "@taskwish/wire";

export async function onGreeterMessage(input: any) {
  return consume(onGreeterMessageStream({ input }));
}

export async function onGreeterMessageRun(params: {
  input: any;
}) {
  return consume(onGreeterMessageStream(params));
}

export async function* onGreeterMessageStream(params: {
  input: any;
}) {
  const input = params.input;

  yield new Trace("Biller::onGreeterMessage", { input });

  const onGreeterMessage = {
      invoice: `Invoice created from greeter message: ${input.name}`,
    };

  yield new Trace("Biller::onGreeterMessage.onGreeterMessage", { result: onGreeterMessage });

  yield new Trace("Biller::onGreeterMessage", { result: onGreeterMessage });

  return onGreeterMessage;
}