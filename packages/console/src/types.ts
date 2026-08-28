export type ConsoleJsonSchema = {
  [key: string]: unknown;
  $schema?: string;
  type?: string | string[];
  properties?: Record<string, ConsoleJsonSchema>;
  required?: string[];
  items?: ConsoleJsonSchema | ConsoleJsonSchema[];
  enum?: unknown[];
  const?: unknown;
  default?: unknown;
  description?: string;
  examples?: unknown[];
};

export type ConsoleInputField = {
  name: string;
  description?: string;
  example?: unknown;
  defaultValue?: unknown;
  required?: boolean;
  schema?: ConsoleJsonSchema;
  metadata?: Record<string, unknown>;
};

export type ConsoleAction = {
  id: string;
  actor: string;
  action: string;
  label: string;
  mode?: "form" | "chat";
  description?: string;
  route: string;
  source: "local" | "http" | "event" | "trait";
  input: ConsoleInputField[];
  inputSchema?: ConsoleJsonSchema;
  meta?: unknown;
};

export type ConsoleConfig = {
  nodeName: string;
  apiKey: string;
  apiPrefix: string;
  actions: ConsoleAction[];
};

export type ConsoleActorState = {
  actor: string;
  state: Record<string, unknown>;
};
