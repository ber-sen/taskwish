import { type } from "arktype";

console.log(type({ name: "string", "lorem?": { name: "string" } }).toString());

function asd(this: any, input: number) {
  return this?.fetch?.(`google ${input}`) ?? `google ${input}`;
}
