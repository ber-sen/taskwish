import type { ExtractActionName } from "../helpers";

type ActionSuggestionsObject<
  Name extends string,
  Action extends (...args: any[]) => any,
> = {
  $: [ExtractActionName<Action>] extends [never]
    ? Name
    : ExtractActionName<Action>;
  "*": (scope: Awaited<ReturnType<Action>>) => Array<[string, string | number]>;
} & (Parameters<Action> extends []
  ? {}
  : Parameters<Action> extends [infer Parameter extends object]
    ? Parameter
    : never);

type ActionSuggestionsReference<Actions> = {
  [Name in keyof Actions & string]: Actions[Name] extends (
    ...args: any[]
  ) => any
    ? ActionSuggestionsObject<Name, Actions[Name]>
    : Actions[Name] extends Record<string, unknown>
      ? {
          [Method in keyof Actions[Name] & string]: Actions[Name][Method] extends (
            ...args: any[]
          ) => any
            ? ActionSuggestionsObject<
                `${Name}.${Method}`,
                Actions[Name][Method]
              >
            : never;
        }[keyof Actions[Name] & string]
      : never;
}[keyof Actions & string];

type ActionInput<Ctx extends Record<any, any>> = Ctx["scope"] extends {
  input: infer Input;
}
  ? Input
  : {};

type MetaField =
  | string
  | {
      description?: string;
      example?: unknown;
    };

export type ActionMeta<
  Ctx extends Record<any, any>,
  Output,
> = {
  description?: string;
  input?: {
    [K in keyof ActionInput<Ctx>]?:
      | string
      | {
          description?: string;
          example?: unknown;
          suggestions?: ActionSuggestionsReference<
            Ctx["scope"] extends { actions: infer Actions } ? Actions : {}
          >;
        };
  };
  output?: Output extends readonly unknown[]
    ? MetaField
    : Output extends object
      ? { [K in keyof Output]?: MetaField }
      : MetaField;
};

export type ValidateActionMeta<
  Meta,
  Ctx extends Record<any, any>,
  Output = never,
> = {
  [K in keyof Meta]: K extends "input"
    ? Meta[K] extends Record<PropertyKey, unknown>
      ? {
          [InputKey in keyof Meta[K]]: InputKey extends keyof ActionInput<Ctx>
            ? Meta[K][InputKey]
            : `Unexpected input key "${InputKey & string}"`;
        }
      : Meta[K]
    : K extends "output"
      ? Output extends object
        ? Meta[K] extends Record<PropertyKey, unknown>
          ? {
              [OutputKey in keyof Meta[K]]: OutputKey extends keyof Output
                ? Meta[K][OutputKey]
                : `Unexpected output key "${OutputKey & string}"`;
            }
          : Meta[K]
        : Meta[K]
      : Meta[K];
};
