import { type } from "arktype";
import { Boria } from "./types";
import { Sica } from "../types";

export function Part<const Schema extends { type: any }>(
  content: type.validate<Schema>
): (
  params: Omit<Sica.InferInput<Schema>, "type">
) => Boria.Part<Sica.InferInput<Schema>> {
  return {} as never;
}
