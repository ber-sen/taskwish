import { TW } from "./core";
import { Pretty, QualifiedActionName, qualifyActionName } from "./helpers";

type TraitLocalEventName<K extends string> = K extends `on${infer EventName}`
  ? EventName extends Capitalize<EventName>
    ? EventName
    : never
  : never;

type TraitExportName<K extends string> = [TraitLocalEventName<K>] extends [
  never,
]
  ? K
  : TraitLocalEventName<K>;

type TraitQualifiedName<K extends string> = [TraitLocalEventName<K>] extends [never]
  ? QualifiedActionName<"", K>
  : `::${TraitLocalEventName<K>}`;

type TraitMeta<
  K extends string,
  Meta = null,
> = [TraitLocalEventName<K>] extends [never]
  ? Meta
  : { event: `::${TraitLocalEventName<K>}` };

type TraitHandler<
  K extends string,
  Handler extends (...args: any[]) => any,
> = [TraitLocalEventName<K>] extends [never]
  ? (
      ...args: Parameters<Handler>
    ) => ReturnType<Handler> extends Promise<any>
      ? ReturnType<Handler>
      : Promise<ReturnType<Handler>>
  : Handler;

type TraitAction<
  T extends Record<string, (...args: any[]) => any>,
  K extends keyof T & string,
> = T[K] extends TW.Action<infer Name, infer Handler, infer Meta>
    ? Name extends `::${string}`
      ? TW.Action<
          TraitQualifiedName<K>,
          Handler,
          TraitMeta<K, Meta>
        >
      : never
    : TW.Action<
        TraitQualifiedName<K>,
        TraitHandler<K, T[K]>,
        TraitMeta<K>
      >;

type TraitActions<T extends Record<string, (...args: any[]) => any>> = {
  [K in keyof T as TraitExportName<K & string>]: TraitAction<T, K & string>;
};

export type Trait<
  T extends Record<string, (...args: any[]) => any>,
> = Pretty<
  TraitActions<T>
>;

interface TraitConstructor {
  <T extends Record<string, (...args: any[]) => any>>(): Trait<T>;
}

function makeTraitAction(key: string) {
  const fn = () => {};
  const isTraitEvent = /^[A-Z]/.test(key);
  const name = isTraitEvent ? `::${key}` : qualifyActionName("", key);
  (fn as any)[TW.Name] = name;
  (fn as any)[TW.Meta] = isTraitEvent ? { event: name } : null;
  return fn;
}

const makeTraitProxy = (): any => {
  const target = {};

  return new Proxy(target as any, {
    get(_target, key: string | symbol) {
      if (typeof key !== "string") return Reflect.get(_target, key);
      if (key in _target) return Reflect.get(_target, key);
      return makeTraitAction(key);
    },
  });
};

export const Trait: TraitConstructor = () => makeTraitProxy() as never;
