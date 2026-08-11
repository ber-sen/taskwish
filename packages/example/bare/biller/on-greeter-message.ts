import { Trace, consume } from "@taskwish/wire";

("use server");

export async function onGreeterMessage(input: any) {
  return consume(stream_onGreeterMessage({ input }));
}

export async function run_onGreeterMessage(params: { input: any }) {
  return consume(stream_onGreeterMessage(params));
}

export async function* stream_onGreeterMessage(params: { input: any }) {
  const input = params.input;

  yield new Trace("Biller::onGreeterMessage", { input });

  const onGreeterMessage = {
    invoice: `Invoice created from greeter message: ${input.name}`,
  };

  yield new Trace("Biller::onGreeterMessage.onGreeterMessage", {
    result: onGreeterMessage,
  });

  yield new Trace("Biller::onGreeterMessage", { result: onGreeterMessage });

  return onGreeterMessage;
}
