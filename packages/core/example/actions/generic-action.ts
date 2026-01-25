import { Action, Taskwish } from "../../src";

export const { genericAction } = Action("generic action").handler(
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
    class extends Taskwish.GenericHandler {
      declare bind: typeof handler<
        Taskwish.Generic<this, "model">,
        Taskwish.Generic<this, "trip">
      >;
    },
);
