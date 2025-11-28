import { Sica } from "../types";

export type Truthy<T> = T extends false | "" | 0 | null | undefined ? never : T;

export const If = <const Condition>(
  condition: Condition
): Sica.Flow<["if"], null, { condition: Truthy<Condition> }> => ({
  [Sica.Type]: ["if"],
  group: null,
  scope: { condition } as never,
});

export const ElseIf = <const Condition>(
  condition: Condition
): Sica.Flow<["else-if"], null, { condition: Truthy<Condition> }> => ({
  [Sica.Type]: ["else-if"],
  group: null,
  scope: { condition } as never,
});

export const Else = (): Sica.Flow<["else"], null, { condition: false }> => ({
  [Sica.Type]: ["else"],
  group: null,
  scope: {} as never,
});
