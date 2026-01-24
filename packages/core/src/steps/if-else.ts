import { Steps, SubSteps } from "./steps";
import { OptionSubSteps } from "./sub-steps";

export type Truthy<T> = T extends false | "" | 0 | null | undefined ? never : T;

export const If = {} as OptionSubSteps;

export const ElseIf = {} as OptionSubSteps;

export const Else = {} as Steps<typeof SubSteps>;
