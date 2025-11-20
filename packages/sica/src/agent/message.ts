import { SicaMessage } from "../types";

export function Message<
  const Content extends SicaMessage.AssistantContent,
  const Meta = null,
>(
  content: Content,
  meta?: Meta
): Meta extends object
  ? SicaMessage.Message<{ role: "assistant"; content: Content; meta: Meta }>
  : SicaMessage.Message<{ role: "assistant"; content: Content }> {
  return {} as never;
}

Message.User = <const Content extends SicaMessage.UserContent, const Meta>(
  content: Content,
  meta?: Meta
): Meta extends object
  ? SicaMessage.Message<{ role: "user"; content: Content; meta: Meta }>
  : SicaMessage.Message<{ role: "user"; content: Content }> => {
  return {} as never;
};

Message.Assistant = <
  const Content extends SicaMessage.AssistantContent,
  const Meta = null,
>(
  content: Content,
  meta?: Meta
): Meta extends object
  ? SicaMessage.Message<{ role: "assistant"; content: Content; meta: Meta }>
  : SicaMessage.Message<{ role: "assistant"; content: Content }> => {
  return {} as never;
};

Message.System = <const Content extends string, const Meta = null>(
  content: Content,
  meta?: Meta
): SicaMessage.Message<{ role: "system"; content: Content }> => {
  return {} as never;
};
