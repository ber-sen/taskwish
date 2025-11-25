import { Sica } from "../types";

export const Source = {
  pipeTo: (destination: any): Sica.StepOption<"source", null> => ({
    stepOptionType: "source",
    group: null,
    params: { destination },
  }),
};
