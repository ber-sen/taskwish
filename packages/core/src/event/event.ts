import { InferSchema, PascalCase } from "../helpers";
import { TW } from "../core";

export function Event<
  const Name extends string,
  const Data,
  const ExtraScope = {},
  Ctx extends Record<any, any> = any,
>(
  type: PascalCase<Name>,
  data: Data,
  scopeOf?: (input: InferSchema<Data>) => ExtraScope,
): {
  [key in Name]: TW.EventKind<Name, InferSchema<Data>, ExtraScope>;
} & {
  [TW.Step]: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["steps"] & Record<Name, TW.EventKind<Name, InferSchema<Data>, ExtraScope>>;
    [TW.Step]: Ctx["step"];
    scope: Record<Name, TW.EventKind<Name, InferSchema<Data>, ExtraScope>> & ExtraScope & Ctx["scope"];
    last: Record<Name, TW.EventKind<Name, InferSchema<Data>, ExtraScope>>;
  };
} {
  const eventKind: any = {
    emit: async function* (eventData: unknown) {
      const event = { $: type, id: null, data: eventData };
      yield event;
      return event;
    },
  };
  if (scopeOf) eventKind.scopeOf = scopeOf;
  return { [type]: eventKind } as any;
}
