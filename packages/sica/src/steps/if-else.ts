import { Flow } from "../flow";

export type Truthy<T> = T extends false | "" | 0 | null | undefined ? never : T;

export const If = <Condition>(condition: Condition) =>
  Flow("if").params({ condition: condition as Truthy<Condition> });

export const ElseIf = <const Condition>(condition: Condition) =>
  Flow("else-if").params({ condition: condition as Truthy<Condition> });

export const Else = () => Flow("else").params({ condition: false });
