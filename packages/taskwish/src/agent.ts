export interface AgentFactory<Params, Scope extends Record<any, any> = {}> {
  abilities(...skills: any): any;
}

export const Agent = <const Params extends string>(
  name: Params
): AgentFactory<Params> => {
  return name as any;
};
