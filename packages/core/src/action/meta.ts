import type { Expression } from "@taskwish/expr";
import type { ExtractActionName } from "../helpers";

type ActionOutput<Action extends (...args: any[]) => any> =
  ReturnType<Action> extends AsyncGenerator<any, infer Return, any>
    ? Awaited<Return>
    : Awaited<ReturnType<Action>>;

type ActionSuggestionOption = {
  value: string | number;
  label: string;
};

type ActionSuggestionExpression<Scope> = Expression<
  Scope,
  ActionSuggestionOption[]
>;

type ActionSuggestionsObject<
  Name extends string,
  Action extends (...args: any[]) => any,
> = {
  $: [ExtractActionName<Action>] extends [never]
    ? Name
    : ExtractActionName<Action>;
  "*": (
    $: Expression<ActionOutput<Action>>,
  ) => ActionSuggestionExpression<ActionOutput<Action>>;
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
          [Method in keyof Actions[Name] &
            string]: Actions[Name][Method] extends (...args: any[]) => any
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

type MetaInputField = {
  description?: string;
  example?: unknown;
};

export type ActionMeta<Ctx extends Record<any, any>, Output> = {
  description?: string;
  input?: {
    [K in keyof ActionInput<Ctx>]?:
      | string
      | (MetaInputField & {
          suggestions?: ActionSuggestionsReference<
            Ctx["scope"] extends { actions: infer Actions } ? Actions : {}
          >;
        });
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

type ResolveSuggestions<Value> = Value extends { suggestions: infer Suggestions }
  ? Omit<Value, "suggestions"> & {
      suggestions: {
        [Key in keyof Suggestions]: Key extends "*"
          ? Suggestions[Key] extends (...args: any[]) => infer Selector
            ? Selector
            : Suggestions[Key]
          : Suggestions[Key];
      };
    }
  : Value;

/** The runtime metadata shape after typed expression builders are evaluated. */
export type ResolveActionMeta<Meta> = Meta extends { input: infer Input }
  ? Omit<Meta, "input"> & {
      input: {
        [Key in keyof Input]: ResolveSuggestions<Input[Key]>;
      };
    }
  : Meta;
