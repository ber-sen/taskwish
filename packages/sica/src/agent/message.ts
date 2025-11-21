import { Boria } from "../types";

export function Message<const Content extends Boria.AssistantContent>(
  content: Content
): Boria.Message<{ role: "assistant"; content: Content }> {
  return {} as never;
}

Message.User = <const Content extends Boria.UserContent>(
  content: Content
): Boria.Message<{ role: "user"; content: Content }> => {
  return {} as never;
};

Message.Assistant = <const Content extends Boria.AssistantContent>(
  content: Content
): Boria.Message<{ role: "assistant"; content: Content }> => {
  return {} as never;
};

Message.System = <const Content extends string>(
  content: Content
): Boria.Message<{ role: "system"; content: Content }> => {
  return {} as never;
};
