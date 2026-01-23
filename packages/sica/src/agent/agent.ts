import { Last, Steps } from "../steps";

export const Agent: AgentFactory = {} as never;

export interface Agent {
  generateText(): Promise<string>;
}

export interface AgentFactory {
  <
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
      steps: Ctx["steps"] & Record<Name, Agent>;
      step: Ctx["step"];
      scope: Record<Name, Agent> & Ctx["scope"];
      [Last]: Agent;
    };
  };
}
