import * as R from "remeda";
// Or import the function directly:
// import { sortBy } from "remeda";

type User = {
  firstName: string;
  lastName: string;
  lastLogin: number;
};

R.take

R.pipe(
  [1, 2, 3],
  R.mapToObj((x) => [String(x), x * 2]),
);


declare function pipe<A, B>(data: A, funcA: (input: A) => B): B;

declare function take<T extends Readonly<any>>(n: T[keyof T]): (array: T) => Array<T[number]>;

pipe(["asd", "lorem"] as const, take("lorem"))
