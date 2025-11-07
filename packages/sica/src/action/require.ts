import { Sica } from "../types";

export const Require = <const Type extends string>(name: Type) => ({
  dep: <const Dep>(dep?: Dep): Generator<never, Dep, Sica.Require<Dep, Type>> =>
    ({}) as never,
});
