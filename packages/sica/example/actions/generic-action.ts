import { Action, Sica } from "../../src";

export default Action(
  "succeed",
  <const S extends unknown[]>() => ({
    [Sica.RUN]: <const M extends S[0], const T extends S[1]>({
      model,
      trip,
    }: {
      model: M;
      trip: T;
    }) => ({
      model,
      trip,
    }),
  }),
  (handler) =>
    class extends Sica.GenericHandler {
      declare bind: typeof handler<
        [Sica.Generic<this, "model">, Sica.Generic<this, "trip">]
      >;
    },
);
