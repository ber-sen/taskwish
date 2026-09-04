import { TW } from "@taskwish/core";
import type { CamelCase, ValidateSchema, InferSchema } from "../helpers";

export interface Tool<Name, Input, Result> {
  name: Name;
  (input: Input): Result;
}

type ToolRun<Input, Output> = (this: {
  input: Input;
}) => AsyncIterable<Output> | PromiseLike<Output> | Output;

interface ToolStep<
  Name extends string,
  Input,
  Output,
  Ctx extends Record<any, any>,
> {
  [TW.Step]: (input: Ctx) => {
    steps: Ctx["steps"] & Record<Name, Tool<Name, Input, Output>>;
    step: Ctx["step"];
    scope: Record<Name, Tool<Name, Input, Output>> & Ctx["scope"];
    last: Tool<Name, Input, Output>;
  };
}

export function Tool<
  const Name extends string,
  const Input,
  const Output,
  Ctx extends Record<any, any>,
>(
  name: CamelCase<Name>,
  options: {
    description: string;
    input: ValidateSchema<Input>;
    run: ToolRun<InferSchema<Input>, Output>;
  },
): ToolStep<Name, InferSchema<Input>, Output, Ctx> {
  return {} as never;
}
