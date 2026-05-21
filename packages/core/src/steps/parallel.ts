import type { Steps, SubStepsResultKind } from "./steps";
import { SubSteps } from "./steps";

export const Parallel = {} as Steps<typeof SubSteps, SubStepsResultKind>;