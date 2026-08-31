import { TW } from "@taskwish/core";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { type as arkType } from "arktype";

import type { CamelCase, InferSchema, ValidateSchema } from "../helpers";

export const ToolDefinition = Symbol.for("TW.ToolDefinition");

type ToolResult<Output> =
  | AsyncIterable<Output>
  | PromiseLike<Output>
  | Output;

export interface TaskWishTool<
  Name extends string = string,
  Input = unknown,
  Output = unknown,
> {
  readonly name: Name;
  readonly description: string;
  readonly inputSchema: StandardSchemaV1<Input>;
  (input: Input): ToolResult<Output>;
  readonly [ToolDefinition]: {
    readonly name: Name;
    readonly description: string;
    readonly inputSchema: StandardSchemaV1<Input>;
  };
}

export type Tool<Name extends string, Input, Output> = TaskWishTool<
  Name,
  Input,
  Output
>;

type ToolRun<Input, Output> = (this: {
  input: Input;
}) => ToolResult<Output>;

interface ToolStep<
  Name extends string,
  Input,
  Output,
  Ctx extends Record<any, any>,
> {
  [TW.Step]: (input: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["steps"] & Record<Name, TaskWishTool<Name, Input, Output>>;
    step: Ctx["step"];
    scope: Record<Name, TaskWishTool<Name, Input, Output>> & Ctx["scope"];
    last: TaskWishTool<Name, Input, Output>;
    plugins: Ctx["plugins"];
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
): TaskWishTool<Name, InferSchema<Input>, Output> &
  ToolStep<Name, InferSchema<Input>, Output, Ctx> {
  const inputSchema = toStandardSchema(options.input as unknown);

  function taskwishTool(
    this: unknown,
    input?: InferSchema<Input>,
  ): TaskWishTool<Name, InferSchema<Input>, Output> | ToolResult<Output> {
    // TaskWish invokes named steps without arguments. In that position the tool
    // registers its executable descriptor in the action scope.
    if (arguments.length === 0) return taskwishTool as never;
    return options.run.call({ input: input as InferSchema<Input> });
  }

  Object.defineProperty(taskwishTool, "name", {
    configurable: true,
    value: name,
  });

  return Object.assign(taskwishTool, {
    description: options.description,
    inputSchema,
    [TW.Name]: name,
    [ToolDefinition]: {
      name,
      description: options.description,
      inputSchema,
    },
    [TW.Step]: (_input: Ctx) => ({}) as never,
  }) as never;
}

export function isTaskWishTool(value: unknown): value is TaskWishTool {
  return (
    typeof value === "function" &&
    ToolDefinition in value &&
    typeof value[ToolDefinition] === "object" &&
    value[ToolDefinition] !== null
  );
}

function toStandardSchema(schema: unknown): StandardSchemaV1 {
  if (
    typeof schema === "object" &&
    schema !== null &&
    "~standard" in schema
  ) {
    return schema as never;
  }

  return arkType(schema as never) as never;
}
