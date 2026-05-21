import { TW } from "@taskwish/core";
import type { CamelCase } from "./helpers";

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
  name: CamelCase<Name>,
  options: {
    model: string;
    instructions?: string;
    tools: Tools;
  },
): {
  [TW.Step]: (input: Ctx) => {
    steps: Ctx["steps"] & Record<Name, Agent<Name, Tools>>;
    [TW.Step]: Ctx["step"];
    scope: Record<Name, Agent<Name, Tools>> & Ctx["scope"];
    last: Agent<Name, Tools>;
  };
} {
  return {} as never;
}
