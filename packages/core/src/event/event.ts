import { InferSchema, PascalCase, QualifiedEventName } from "../helpers";
import { TW } from "../core";
import { Signal } from "@taskwish/wire";

type EventSpec<Name extends string> =
  Name extends `${infer Actor}::${infer Event}`
    ? `${PascalCase<Actor>}::${PascalCase<Event>}`
    : Name extends `${infer Actor}:${infer Event}`
    ? `${PascalCase<Actor>}:${PascalCase<Event>}`
    : PascalCase<Name>;

type EventRuntimeName<Name extends string> =
  Name extends `${infer Actor}::${infer Event}`
    ? QualifiedEventName<Actor, Event>
    : Name extends `${infer Actor}:${infer Event}`
    ? QualifiedEventName<Actor, Event>
    : Name;

type ScopedEventName<Actor extends string, Name extends string> =
  EventRuntimeName<Name> extends `${string}::${string}`
    ? EventRuntimeName<Name>
    : QualifiedEventName<Actor, Name>;

export function Event<
  const Name extends string,
  const Data = {},
  const ExtraScope = {},
  Ctx extends Record<any, any> = any,
>(
  type: EventSpec<Name>,
  data?: Data,
  scopeOf?: (input: InferSchema<Data>) => ExtraScope,
): {
  [key in Name]: TW.EventKind<
    EventRuntimeName<Name>,
    InferSchema<Data>,
    ExtraScope
  >;
} & {
  [TW.Step]: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["steps"] &
      Record<
        Name,
        TW.EventKind<
          ScopedEventName<Ctx["name"] & string, Name>,
          InferSchema<Data>,
          ExtraScope
        >
      >;
    step: Ctx["step"];
    scope: Record<
      Name,
      TW.EventKind<
        ScopedEventName<Ctx["name"] & string, Name>,
        InferSchema<Data>,
        ExtraScope
      >
    > &
      ExtraScope &
      Ctx["scope"];
    last: Record<
      Name,
      TW.EventKind<
        ScopedEventName<Ctx["name"] & string, Name>,
        InferSchema<Data>,
        ExtraScope
      >
    >;
  };
} {
  const runtimeName =
    typeof type === "string" && type.includes("::")
      ? type
      : typeof type === "string" && type.includes(":")
      ? type.replace(":", "::")
      : type;
  const eventKind: any = {
    [TW.Name]: runtimeName,
    [TW.Meta]: null,
    emit: async function* (signalData: unknown) {
      const signal = new Signal(eventKind[TW.Name], signalData);
      yield signal;
      return signal;
    },
  };
  if (scopeOf) eventKind.scopeOf = scopeOf;
  return { [type]: eventKind } as any;
}
