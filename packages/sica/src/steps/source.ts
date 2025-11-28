import { Sica } from "../types";

export const Source = {
  pipeTo: (destination: any): Sica.Flow<["source"], null> => ({
    [Sica.Type]: ["source"],
    group: null,
  }),
};
