import { InferSchema, ValidateSchema } from "../helpers";
import { Taskwish } from "../types";
export interface Agent<Name extends string, Tools extends string[]> {
  name: Name;
  tools: Tools;
  generate(options: { prompt: string }): Promise<string>;
}

export function Agent<
  const Name extends string,
  const Tools extends string[],
  Ctx extends Record<any, any>,
>(
  name: Name,
  options: {
    model: string;
    instructions?: string;
    tools: Tools;
  },
): {
  [Taskwish.Step]: (input: Ctx) => {
    steps: Ctx["steps"] & Record<Name, Agent<Name, Tools>>;
    [Taskwish.Step]: Ctx["step"];
    scope: Record<Name, Agent<Name, Tools>> & Ctx["scope"];
    last: Agent<Name, Tools>;
  };
} {
  return {} as never;
}

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
  [Taskwish.Step]: (input: Ctx) => {
    steps: Ctx["steps"] & Record<Name, Tool<Name, Input, Output>>;
    [Taskwish.Step]: Ctx["step"];
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
  name: Name,
  options: {
    description: string;
    input: ValidateSchema<Input>;
    run: ToolRun<InferSchema<Input>, Output>;
  },
): ToolStep<Name, InferSchema<Input>, Output, Ctx> {
  return {} as never;
}
