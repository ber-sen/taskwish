import { Action, Sica } from "../../src";

export default Action(
  "succeed",
  <const S0, const S1>() =>
    <const Model extends S0, const Trip extends S1>({
      model,
      trip,
    }: {
      model: Model;
      trip: Trip;
    }) => ({
      model,
      trip,
    }),
  (handler) =>
    class extends Sica.GenericHandler {
      declare bind: typeof handler<
        Sica.Generic<this, "model">,
        Sica.Generic<this, "trip">
      >;
    }
);
