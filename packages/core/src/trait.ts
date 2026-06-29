import { TW } from "./core";
import {
  Pretty,
  QualifiedActionName,
  qualifyActionName,
} from "./helpers";

type TraitActions<T extends Record<string, (...args: any[]) => any>> = {
  [K in keyof T]: T[K] extends TW.Action<any, infer Handler, infer Meta>
    ? TW.Action<QualifiedActionName<"", K & string>, Handler, Meta>
    : TW.Action<
        QualifiedActionName<"", K & string>,
        (
          ...args: Parameters<T[K]>
        ) => ReturnType<T[K]> extends Promise<any>
          ? ReturnType<T[K]>
          : Promise<ReturnType<T[K]>>,
        null
      >;
};

interface TraitConstructor {
  <T extends Record<string, (...args: any[]) => any>>(): Pretty<TraitActions<T>>;
}

const makeProxy = () =>
  new Proxy({} as any, {
    get(_target, key: string | symbol) {
      if (typeof key !== "string") return undefined;
      const fn = () => {};
      (fn as any)[TW.Name] = qualifyActionName("", key);
      (fn as any)[TW.Meta] = null;
      return fn;
    },
  });

export const Trait: TraitConstructor = () => {
  return makeProxy() as never;
};
