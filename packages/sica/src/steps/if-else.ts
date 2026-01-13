import { Flow } from "../flow";
import { SubSteps } from "./sub-steps";

export type Truthy<T> = T extends false | "" | 0 | null | undefined ? never : T;

export const If = {} as SubSteps

export const ElseIf = {} as SubSteps

export const Else = {} as SubSteps
