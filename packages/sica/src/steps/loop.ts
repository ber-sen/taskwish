import { OptionSubSteps } from "./sub-steps";

export const Loop = {} as OptionSubSteps & { Range: typeof Range };

export const Range = (from: number, to: number) =>
  Flow("range").params({
    from,
    to,
  });
