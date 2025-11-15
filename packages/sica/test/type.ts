import { type } from "arktype";

console.log(type({ name: "string", "lorem?": { name: "string" } }).toString());
