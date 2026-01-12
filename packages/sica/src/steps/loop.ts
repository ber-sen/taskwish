import { Flow } from "../flow";
import { SubSteps } from "./sub-steps";

export const Loop = {} as SubSteps & { Range: typeof Range };

export const Range = (from: number, to: number) =>
  Flow("range").params({
    from,
    to,
  });
