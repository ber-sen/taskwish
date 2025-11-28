import { Sica } from "../types";

export const Loop = <const List extends any[]>(
  list: List
): Sica.Flow<
  ["loop"],
  null,
  {
    loop: { value: List[number]; index: number };
  }
> =>
  ({
    [Sica.Type]: ["loop"],
    group: null,
  }) as never;

export const Range = (
  from: number,
  to: number
): Sica.Flow<["range"], ["loop"]> => ({
  [Sica.Type]: ["range"],
  group: ["loop"],
});
