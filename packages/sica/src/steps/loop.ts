import { Flow } from "../flow";

export const Loop = <const List extends any[]>(list: List) =>
  Flow("loop").params({
    loop: { value: {} as List[number], index: {} as number },
  });

export const Range = (from: number, to: number) =>
  Flow("range").params({
    from,
    to,
  });
