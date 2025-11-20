import { SicaMessage } from "../types";

export function Message<const Content extends SicaMessage.AssistantContent>(
  content: Content
): SicaMessage.Message<{ role: "assistant"; content: Content }> {
  return {} as never;
}

Message.User = <const Content extends SicaMessage.UserContent>(
  content: Content
): SicaMessage.Message<{ role: "user"; content: Content }> => {
  return {} as never;
};

Message.Assistant = <const Content extends SicaMessage.AssistantContent>(
  content: Content
): SicaMessage.Message<{ role: "assistant"; content: Content }> => {
  return {} as never;
};

Message.System = <const Content extends string>(
  content: Content
): SicaMessage.Message<{ role: "system"; content: Content }> => {
  return {} as never;
};
