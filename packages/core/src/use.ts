import { TW } from "./core";

export type InferTypeConfig<Filter extends string | undefined = undefined> = {
  [TW.Type]: "InferType";
  filter: Filter;
};

export function InferType(): InferTypeConfig<undefined>;
export function InferType<const F extends string>(
  filter: F,
): InferTypeConfig<F>;
export function InferType(filter?: string): InferTypeConfig<any> {
  return { [TW.Type]: "InferType", filter };
}
