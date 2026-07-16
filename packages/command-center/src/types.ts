export type CommandCenterInputField = {
  name: string;
  description?: string;
  example?: unknown;
};

export type CommandCenterAction = {
  id: string;
  actor: string;
  action: string;
  label: string;
  description?: string;
  color: string;
  route: string;
  source: "local" | "http" | "event" | "trait";
  input: CommandCenterInputField[];
  meta?: unknown;
};

export type CommandCenterConfig = {
  nodeName: string;
  apiKey: string;
  apiPrefix: string;
  actions: CommandCenterAction[];
};
