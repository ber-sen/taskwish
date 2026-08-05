import { TW } from "./core";
import {
  Pretty,
  QualifiedActionName,
  qualifyActionName,
} from "./helpers";

type TraitService = string | undefined;

type TraitOptions<T extends Record<string, (...args: any[]) => any>> = {
  service?: string;
  self?: keyof T & string;
};

type TraitRuntimeOptions = {
  service?: string;
  self?: string;
};

type OptionService<Options> = Options extends { service?: infer Service }
  ? Service extends string
    ? Service
    : undefined
  : undefined;

type OptionSelf<Options> = Options extends { self?: infer Self }
  ? Self extends string
    ? Self
    : undefined
  : undefined;

type TraitLocalEventName<K extends string> = K extends `on${infer EventName}`
  ? EventName extends Capitalize<EventName>
    ? EventName
    : never
  : never;

type TraitEventName<
  K extends string,
  Service extends TraitService,
> = [TraitLocalEventName<K>] extends [never]
  ? never
  : Service extends string
    ? `${Service}${TraitLocalEventName<K>}`
    : TraitLocalEventName<K>;

type TraitExportName<K extends string> = [TraitLocalEventName<K>] extends [
  never,
]
  ? K
  : TraitLocalEventName<K>;

type TraitQualifiedName<
  K extends string,
  Service extends TraitService,
> = [TraitEventName<K, Service>] extends [never]
  ? QualifiedActionName<"", K>
  : `::${TraitEventName<K, Service>}`;

type TraitMeta<
  K extends string,
  Service extends TraitService,
  Meta = null,
> = [TraitEventName<K, Service>] extends [never]
  ? Meta
  : { event: `::${TraitEventName<K, Service>}` };

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
  Service extends TraitService,
> = T[K] extends TW.Action<infer Name, infer Handler, infer Meta>
    ? Name extends `::${string}`
      ? TW.Action<
          TraitQualifiedName<K, Service>,
          Handler,
          TraitMeta<K, Service, Meta>
        >
      : never
    : TW.Action<
        TraitQualifiedName<K, Service>,
        TraitHandler<K, T[K]>,
        TraitMeta<K, Service>
      >;

type TraitActions<
  T extends Record<string, (...args: any[]) => any>,
  Service extends TraitService = undefined,
> = {
  [K in keyof T as TraitExportName<K & string>]: TraitAction<
    T,
    K & string,
    Service
  >;
};

type TraitResult<
  T extends Record<string, (...args: any[]) => any>,
  Options extends TraitOptions<T>,
  Self extends string | undefined = OptionSelf<Options>,
  Service extends TraitService = OptionService<Options>,
> = Self extends keyof T & string
  ? TraitAction<T, Self, Service> & TraitActions<T, Service>
  : TraitActions<T, Service>;

export type Trait<
  T extends Record<string, (...args: any[]) => any>,
> = Pretty<
  TraitActions<T>
>;

type TraitSelfConstraint<Options extends TraitRuntimeOptions> =
  OptionSelf<Options> extends infer Self extends string
    ? Record<Self, (...args: any[]) => any>
    : {};

type ConfiguredTraitBuilder<Options extends TraitRuntimeOptions> = <
  T extends Record<string, (...args: any[]) => any> &
    TraitSelfConstraint<Options>,
>() => TraitResult<T, Options & TraitOptions<T>>;

interface TraitConstructor {
  <const Options extends TraitRuntimeOptions>(
    options: Options,
  ): ConfiguredTraitBuilder<Options>;
  <T extends Record<string, (...args: any[]) => any>>(): Trait<T>;
}

function traitExportName(key: string) {
  return /^on[A-Z]/.test(key) ? key.slice(2) : key;
}

function makeTraitAction(key: string, service?: string) {
  const fn = () => {};
  const isTraitEvent = /^[A-Z]/.test(key);
  const name = isTraitEvent
    ? `::${service ?? ""}${key}`
    : qualifyActionName("", key);
  (fn as any)[TW.Name] = name;
  (fn as any)[TW.Meta] = isTraitEvent ? { event: name } : null;
  return fn;
}

const makeTraitProxy = (options?: TraitRuntimeOptions): any => {
  const target = {};

  return new Proxy(target as any, {
    get(_target, key: string | symbol) {
      if (typeof key !== "string") return Reflect.get(_target, key);
      if (key in _target) return Reflect.get(_target, key);
      return makeTraitAction(key, options?.service);
    },
  });
};

const makeSelfTraitProxy = (options: TraitRuntimeOptions): any => {
  const target = makeTraitAction(traitExportName(options.self!), options.service);

  return new Proxy(target as any, {
    apply(_target, thisArg, args) {
      return Reflect.apply(_target, thisArg, args);
    },
    get(_target, key: string | symbol) {
      if (typeof key !== "string") return Reflect.get(_target, key);
      if (key in _target) return Reflect.get(_target, key);
      return makeTraitAction(key, options?.service);
    },
  });
};

export const Trait: TraitConstructor = (options?: TraitRuntimeOptions) => {
  if (options !== undefined) {
    return (() =>
      typeof options.self === "string"
        ? makeSelfTraitProxy(options)
        : makeTraitProxy(options)) as never;
  }

  return makeTraitProxy() as never;
};
