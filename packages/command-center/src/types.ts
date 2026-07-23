export type CommandCenterJsonSchema = {
  [key: string]: unknown;
  $schema?: string;
  type?: string | string[];
  properties?: Record<string, CommandCenterJsonSchema>;
  required?: string[];
  items?: CommandCenterJsonSchema | CommandCenterJsonSchema[];
  enum?: unknown[];
  const?: unknown;
  default?: unknown;
  description?: string;
  examples?: unknown[];
};

export type CommandCenterInputField = {
  name: string;
  description?: string;
  example?: unknown;
  defaultValue?: unknown;
  required?: boolean;
  schema?: CommandCenterJsonSchema;
  metadata?: Record<string, unknown>;
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
  inputSchema?: CommandCenterJsonSchema;
  meta?: unknown;
};

export type CommandCenterConfig = {
  nodeName: string;
  apiKey: string;
  apiPrefix: string;
  actions: CommandCenterAction[];
};
