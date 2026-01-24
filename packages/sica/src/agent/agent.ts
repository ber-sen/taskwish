import { StandardSchemaV1 } from "@standard-schema/spec";
import { Last, Steps } from "../steps";

export interface Agent<Name extends string, Tools extends string[]> {
  name: Name;
  tools: Tools;
  generateText(): Promise<string>;
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
  step: (input: Ctx) => {
    steps: Ctx["steps"] & Record<Name, Agent<Name, Tools>>;
    step: Ctx["step"];
    scope: Record<Name, Agent<Name, Tools>> & Ctx["scope"];
    [Last]: Agent<Name, Tools>;
  };
} {
  return {} as never;
}

export interface Tool<Name, Handler extends (params: any) => any> {
  (input: Parameters<Handler>[0]): ReturnType<Handler>[0];
}

export function Tool<
  const Name extends string,
  const Input extends object,
  const Handler extends (input: Input) => any,
  Ctx extends Record<any, any>,
>(
  name: Name,
  options: {
    description: string;
    inputSchema: StandardSchemaV1<Input>;
    run: Handler;
  },
): {
  step: (input: Ctx) => {
    steps: Ctx["steps"] & Record<Name, Tool<Name, Handler>>;
    step: Ctx["step"];
    scope: Record<Name, Tool<Name, Handler>> & Ctx["scope"];
    [Last]: Tool<Name, Handler>;
  };
} {
  return {} as never;
}
