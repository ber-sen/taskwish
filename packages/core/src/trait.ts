import { TW } from "./core";
import {
  PascalCase,
  Pretty,
  QualifiedActionName,
  qualifyActionName,
} from "./helpers";

type TraitActions<
  N extends string,
  T extends Record<string, (...args: any[]) => any>,
> = {
  [K in keyof T]: T[K] extends TW.Action<
    QualifiedActionName<N, K & string>,
    infer Handler,
    infer Meta
  >
    ? TW.Action<
        QualifiedActionName<N, K & string>,
        Handler,
        Pretty<Meta & { trait: true }>
      >
    : TW.Action<
        QualifiedActionName<N, K & string>,
        (
          ...args: Parameters<T[K]>
        ) => ReturnType<T[K]> extends Promise<any>
          ? ReturnType<T[K]>
          : Promise<ReturnType<T[K]>>,
        { trait: true }
      >;
};

type AnonTraitActions<T extends Record<string, (...args: any[]) => any>> = {
  [K in keyof T]: T[K] extends TW.Action<K & string, infer Handler, infer Meta>
    ? TW.Action<K & string, Handler, Pretty<Meta & { trait: true }>>
    : TW.Action<
        K & string,
        (
          ...args: Parameters<T[K]>
        ) => ReturnType<T[K]> extends Promise<any>
          ? ReturnType<T[K]>
          : Promise<ReturnType<T[K]>>,
        { trait: true }
      >;
};

interface TraitFn<N extends string> {
  <T extends Record<string, (...args: any[]) => any>>(): Pretty<
    TraitActions<N, T>
  >;
}

type TraitResult<N extends string> = {
  [K in N]: TraitFn<K>;
};

interface TraitConstructor {
  <const N extends string>(name: PascalCase<N>): Pretty<TraitResult<N>>;
  <T extends Record<string, (...args: any[]) => any>>(): Pretty<AnonTraitActions<T>>;
}

const makeProxy = (prefix?: string) =>
  new Proxy({} as any, {
    get(_target, key: string | symbol) {
      if (typeof key !== "string") return undefined;
      const fn = () => {};
      (fn as any)[TW.Name] = prefix ? qualifyActionName(prefix, key) : key;
      (fn as any)[TW.Meta] = { trait: true };
      return fn;
    },
  });

export const Trait: TraitConstructor = (name?: string) => {
  if (name !== undefined) {
    return ({ [name]: () => makeProxy(name) }) as never;
  }
  return makeProxy() as never;
};
