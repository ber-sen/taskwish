// ── Dot paths ────────────────────────────────────────────────────────────────

type DotPathIdentifierStart =
  | "_"
  | LowercaseLetter
  | Uppercase<LowercaseLetter>;

type LowercaseLetter =
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z";

type DotPathIdentifierPart = DotPathIdentifierStart | `${number}`;

type IsDotPathIdentifierTail<Value extends string> = Value extends ""
  ? true
  : Value extends `${DotPathIdentifierPart}${infer Rest}`
  ? IsDotPathIdentifierTail<Rest>
  : false;

type IsDotPathIdentifier<Value extends string> =
  Value extends `${DotPathIdentifierStart}${infer Rest}`
    ? IsDotPathIdentifierTail<Rest>
    : false;

type AppendDotPathProperty<
  Prefix extends string,
  Key extends string,
> = IsDotPathIdentifier<Key> extends true
  ? Prefix extends ""
    ? Key
    : `${Prefix}.${Key}`
  : never;

type ExcludeFunctions<Value> = Value extends (...args: any[]) => any
  ? never
  : Value;

type DotPathSelfEntry<Prefix extends string, Value> = Prefix extends ""
  ? never
  : { path: Prefix; value: Value };

type DotPathEntry<
  Value,
  Prefix extends string = "",
  Depth extends unknown[] = [],
> = DotPathEntryValue<ExcludeFunctions<Value>, Prefix, Depth>;

type DotPathEntryValue<
  Value,
  Prefix extends string,
  Depth extends unknown[],
> = [Value] extends [never]
  ? never
  : Depth["length"] extends 6
  ? DotPathSelfEntry<Prefix, Value>
  :
      | DotPathSelfEntry<Prefix, Value>
      | (0 extends 1 & Value
          ? never
          : Value extends readonly unknown[]
          ? never
          : Value extends object
          ? {
              [Key in keyof Value & string]: DotPathEntry<
                Value[Key],
                AppendDotPathProperty<Prefix, Key>,
                [...Depth, unknown]
              >;
            }[keyof Value & string]
          : never);

export type DotPath<Value> = DotPathEntry<Value> extends infer Entry
  ? Entry extends { path: infer Path extends string }
    ? Path
    : never
  : never;

export type DotPathValue<
  Value,
  Path extends string,
> = DotPathEntry<Value> extends infer Entry
  ? Entry extends {
      path: infer EntryPath extends string;
      value: infer PathValue;
    }
    ? Path extends EntryPath
      ? PathValue
      : never
    : never
  : never;

type ArrayItemAtPath<Value, Path> = Path extends string
  ? Path extends ""
    ? Value extends readonly (infer Item extends object)[]
      ? Item
      : never
    : DotPathValue<Value, Path> extends readonly (infer Item extends object)[]
    ? Item
    : never
  : never;

type MapFields<Scope, Path, Alias extends string> = [
  `${NoInfer<Alias>}.${DotPath<ArrayItemAtPath<Scope, Path>>}`,
  `${NoInfer<Alias>}.${DotPath<ArrayItemAtPath<Scope, Path>>}`,
];

type SerializablePicker<Scope> = {
  toJSON(): unknown;
  toFn(value: Scope): any;
};

type MappedExpression<Path, Scope> = SerializablePicker<Scope> & {
  filter: <const Alias extends string>(
    alias: [Alias],
    predicate: `${Path extends string
      ? Path
      : never}.${NoInfer<Alias>}.${string}`,
  ) => SerializablePicker<Scope>;
};

type Expression<Scope, Path> = SerializablePicker<Scope> & {
  map: <const Alias extends string, MappedScope>(
    alias: [Alias],
    fields: MapFields<MappedScope, Path, Alias>,
  ) => MappedExpression<Path, MappedScope>;
};

type SerializedExpression =
  | string
  | [string, [string], readonly [string, string]]
  | [string, [string], readonly [string, string], [string], string];

const createExpression = <Scope, Path>(
  path: Path,
  serialized: SerializedExpression,
): Expression<Scope, Path> => {
  const expression = (() => undefined) as unknown as Expression<Scope, Path>;
  Object.defineProperty(expression, "path", { value: path });
  Object.defineProperty(expression, "toJSON", {
    value: () => serialized,
  });

  return new Proxy(expression, {
    get(target, property, receiver) {
      if (property === "map") {
        return (alias: [string], fields: readonly [string, string]) => {
          const mapped = createExpression(path, [
            `${String(path)}.map`,
            alias,
            fields,
          ] as const) as unknown as MappedExpression<Path, unknown>;

          Object.defineProperty(mapped, "filter", {
            value: (filterAlias: [string], predicate: string) =>
              createExpression(path, [
                `${String(path)}.map`,
                alias,
                fields,
                filterAlias,
                predicate,
              ]),
          });

          return mapped;
        };
      }

      if (property === Symbol.toPrimitive) return () => path;
      return Reflect.get(target, property, receiver);
    },
  });
};

export function $<Scope, const Path>(
  path: keyof Scope | Path,
): Expression<Scope, Path> {
  return createExpression(path, String(path)) as Expression<Scope, Path>;
}
