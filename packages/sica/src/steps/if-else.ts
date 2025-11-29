import { Flow } from "../flow";
import { Sica } from "../types";

export type Truthy<T> = T extends false | "" | 0 | null | undefined ? never : T;

export const If = <Condition>(condition: Condition) =>
  Flow({
    type: ["if"],
    scope: { condition: condition as Truthy<Condition> },
    group: null,
  });

export const ElseIf = <const Condition>(
  condition: Condition
): Sica.Flow<["else-if"], { condition: Truthy<Condition> }> => ({
  [Sica.Type]: ["else-if"],
  group: null,
  scope: { condition } as never,
});

export const Else = (): Sica.Flow<["else"], { condition: false }> => ({
  [Sica.Type]: ["else"],
  group: null,
  scope: {} as never,
});
