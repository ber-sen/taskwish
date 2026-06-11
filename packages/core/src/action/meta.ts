import type { ExtractActionName } from "../helpers";

type AppendProperty<Prefix extends string, Key extends string> =
  Prefix extends "." ? `.${Key}` : `${Prefix}.${Key}`;

type CompatibleJqPaths<
  Value,
  Option,
  Prefix extends string = ".",
  Multiple extends boolean = false,
  Depth extends unknown[] = [],
> = Depth["length"] extends 6
  ? never
  :
      | (Multiple extends true
          ? Value extends Option
            ? Prefix
            : never
          : Value extends readonly (infer Item)[]
            ? Item extends Option
              ? Prefix
              : never
            : never)
      | (Value extends readonly (infer Item)[]
          ?
              | CompatibleJqPaths<
                  Item,
                  Option,
                  `${Prefix}[]`,
                  true,
                  [...Depth, unknown]
                >
              | CompatibleJqPaths<
                  Item,
                  Option,
                  `${Prefix}[${number}]`,
                  Multiple,
                  [...Depth, unknown]
                >
          : Value extends object
            ? {
                [Key in keyof Value & string]: CompatibleJqPaths<
                  Value[Key],
                  Option,
                  AppendProperty<Prefix, Key>,
                  Multiple,
                  [...Depth, unknown]
                >;
              }[keyof Value & string]
            : never);

type JqPath<Value, Option> = CompatibleJqPaths<Value, Option>;

type CompatibleValueJqPaths<
  Value,
  Option,
  Prefix extends string = ".",
  Depth extends unknown[] = [],
> = Depth["length"] extends 6
  ? never
  :
      | (Value extends Option ? Prefix : never)
      | (Value extends readonly (infer Item)[]
          ?
              | CompatibleValueJqPaths<
                  Item,
                  Option,
                  `${Prefix}[]`,
                  [...Depth, unknown]
                >
              | CompatibleValueJqPaths<
                  Item,
                  Option,
                  `${Prefix}[${number}]`,
                  [...Depth, unknown]
                >
          : Value extends object
            ? {
                [Key in keyof Value & string]: CompatibleValueJqPaths<
                  Value[Key],
                  Option,
                  AppendProperty<Prefix, Key>,
                  [...Depth, unknown]
                >;
              }[keyof Value & string]
            : never);

type ValueJqPath<Value, Option> = CompatibleValueJqPaths<Value, Option>;

type MappedJqPaths<
  Value,
  Option,
  Prefix extends string = ".",
  Depth extends unknown[] = [],
> = Depth["length"] extends 6
  ? never
  : Value extends readonly (infer Item)[]
    ?
        | (Item extends object
            ? [
                `${Prefix}[]`,
                {
                  label: ValueJqPath<Item, string>;
                  value: ValueJqPath<Item, Option>;
                },
              ]
            : never)
        | MappedJqPaths<
            Item,
            Option,
            `${Prefix}[]`,
            [...Depth, unknown]
          >
    : Value extends object
      ? {
          [Key in keyof Value & string]: MappedJqPaths<
            Value[Key],
            Option,
            AppendProperty<Prefix, Key>,
            [...Depth, unknown]
          >;
        }[keyof Value & string]
      : never;

type SuggestionsPick<Value, Option> =
  | JqPath<Value, Option>
  | MappedJqPaths<Value, Option>;

type ActionSuggestionsObject<
  Name extends string,
  Action extends (...args: any[]) => any,
  Option,
> = {
  $: [ExtractActionName<Action>] extends [never]
    ? Name
    : ExtractActionName<Action>;
  $pick: SuggestionsPick<Awaited<ReturnType<Action>>, Option>;
} & (Parameters<Action> extends []
  ? {}
  : Parameters<Action> extends [infer Parameter extends object]
    ? Parameter
    : never);

type ActionSuggestionsReference<Actions, Option> = {
  [Name in keyof Actions & string]: Actions[Name] extends (
    ...args: any[]
  ) => any
    ? ActionSuggestionsObject<Name, Actions[Name], Option>
    : Actions[Name] extends Record<string, unknown>
      ? {
          [Method in keyof Actions[Name] & string]: Actions[Name][Method] extends (
            ...args: any[]
          ) => any
            ? ActionSuggestionsObject<
                `${Name}.${Method}`,
                Actions[Name][Method],
                Option
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
            Ctx["scope"] extends { actions: infer Actions } ? Actions : {},
            ActionInput<Ctx>[K]
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
