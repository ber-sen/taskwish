import { spawn, type ChildProcess } from "node:child_process";
import { createRequire } from "node:module";
import { Readable, Writable } from "node:stream";
import * as acp from "@agentclientprotocol/sdk";

type JsonObject = Record<string, unknown>;

export const CodexAcpConfig = {
  model: "model",
  reasoningEffort: "reasoning_effort",
  mode: "mode",
  collaborationMode: "collaboration_mode",
  fastMode: "fast-mode",
} as const;

export type CodexAcpConfigId =
  (typeof CodexAcpConfig)[keyof typeof CodexAcpConfig];

export type CodexPermissionPolicy =
  | "cancel"
  | "allow_once"
  | "allow_always"
  | "reject_once"
  | "reject_always";

export type CodexPermissionHandler = (
  request: acp.RequestPermissionRequest
) => acp.RequestPermissionResponse | PromiseLike<acp.RequestPermissionResponse>;

export type CodexAgentMode = "read-only" | "agent" | "agent-full-access";

export type CodexPromptInput =
  | string
  | acp.ContentBlock
  | Array<acp.ContentBlock>;

export interface CodexAgentOptions {
  name?: string;
  cwd?: string;
  additionalDirectories?: string[];
  mcpServers?: acp.McpServer[];
  model?: string;
  reasoningEffort?: string;
  instructions?: string;
  codexConfig?: JsonObject;
  modelProvider?: string;
  codexPath?: string;
  defaultAuthRequest?: acp.AuthenticateRequest;
  initialAgentMode?: CodexAgentMode;
  noBrowser?: boolean;
  appServerLogs?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string | undefined>;
  stderr?: "pipe" | "inherit" | "ignore";
  clientName?: string;
  clientVersion?: string;
  clientCapabilities?: acp.ClientCapabilities;
  permission?: CodexPermissionPolicy | CodexPermissionHandler;
  onSessionUpdate?: (message: acp.ActiveSessionMessage) => void | Promise<void>;
  onStderr?: (chunk: string) => void;
  readTextFile?: (
    request: acp.ReadTextFileRequest
  ) => acp.ReadTextFileResponse | PromiseLike<acp.ReadTextFileResponse>;
  writeTextFile?: (
    request: acp.WriteTextFileRequest
  ) =>
    | acp.WriteTextFileResponse
    | void
    | PromiseLike<acp.WriteTextFileResponse | void>;
}

export interface CodexPromptOptions {
  prompt: CodexPromptInput;
  instructions?: string;
  newSession?: boolean;
  permission?: CodexPermissionPolicy | CodexPermissionHandler;
  cancellationSignal?: AbortSignal;
  onSessionUpdate?: (message: acp.ActiveSessionMessage) => void | Promise<void>;
  onTextDelta?: (text: string) => void | Promise<void>;
}

export interface CodexAskOptions extends Omit<CodexPromptOptions, "prompt"> {
  prompt: CodexPromptInput;
  mode?: CodexAgentMode;
}

export interface CodexPromptResult {
  text: string;
  stopReason: acp.StopReason;
  response: acp.PromptResponse;
  sessionId: acp.SessionId;
  messages: acp.ActiveSessionMessage[];
}

export interface CodexAcpCommand {
  command: string;
  args: string[];
}

export function resolveCodexAcpCommand(): CodexAcpCommand {
  try {
    const require = createRequire(import.meta.url);
    const binPath = require.resolve("@agentclientprotocol/codex-acp");
    const node = process.versions?.node ? process.execPath : "node";
    return { command: node, args: [binPath] };
  } catch {
    return {
      command: process.platform === "win32" ? "npx.cmd" : "npx",
      args: ["-y", "@agentclientprotocol/codex-acp"],
    };
  }
}

export class CodexAgent {
  readonly name: string;

  private readonly options: CodexAgentOptions;
  private child: ChildProcess | null = null;
  private connection: acp.ClientConnection | null = null;
  private connectPromise: Promise<acp.ClientConnection> | null = null;
  private session: acp.ActiveSession | null = null;
  private permissionOverride:
    | CodexPermissionPolicy
    | CodexPermissionHandler
    | null = null;

  constructor(options: CodexAgentOptions = {}) {
    this.options = options;
    this.name = options.name ?? "codex";
  }

  async connect(): Promise<acp.ClientConnection> {
    if (this.connection && !this.connection.signal.aborted) {
      return this.connection;
    }

    if (!this.connectPromise) {
      this.connectPromise = this.openConnection();
    }

    try {
      return await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  async createSession(
    options: {
      newSession?: boolean;
      cwd?: string;
      additionalDirectories?: string[];
      mcpServers?: acp.McpServer[];
    } = {}
  ): Promise<acp.ActiveSession> {
    if (options.newSession && this.session) {
      await this.closeSession();
    }

    if (this.session && !options.newSession) return this.session;

    const connection = await this.connect();
    const cwd = options.cwd ?? this.options.cwd ?? process.cwd();
    const session = await connection.agent
      .buildSession({
        cwd,
        additionalDirectories:
          options.additionalDirectories ?? this.options.additionalDirectories,
        mcpServers: options.mcpServers ?? this.options.mcpServers ?? [],
      })
      .start();

    this.session = session;
    await this.applySessionDefaults(session.sessionId);
    return session;
  }

  async setConfigOption(
    configId: CodexAcpConfigId | (string & {}),
    value: string | boolean
  ): Promise<acp.SetSessionConfigOptionResponse> {
    const session = await this.createSession();
    const connection = await this.connect();
    return connection.agent.request(acp.methods.agent.session.setConfigOption, {
      sessionId: session.sessionId,
      configId,
      ...(typeof value === "boolean" ? { type: "boolean", value } : { value }),
    });
  }

  async setMode(modeId: CodexAgentMode): Promise<acp.SetSessionModeResponse> {
    const session = await this.createSession();
    const connection = await this.connect();
    return connection.agent.request(acp.methods.agent.session.setMode, {
      sessionId: session.sessionId,
      modeId,
    });
  }

  async prompt(
    input: CodexPromptInput | CodexPromptOptions
  ): Promise<CodexPromptResult> {
    const stream = this.streamPrompt(input);
    let next = await stream.next();
    while (!next.done) {
      next = await stream.next();
    }
    return next.value;
  }

  async *streamPrompt(
    input: CodexPromptInput | CodexPromptOptions
  ): AsyncGenerator<string, CodexPromptResult> {
    const options = normalizePromptOptions(input);
    const session = await this.createSession({
      newSession: options.newSession,
    });
    const prompt = this.withInstructions(options.prompt, options.instructions);
    const messages: acp.ActiveSessionMessage[] = [];
    let text = "";
    const previousPermission = this.permissionOverride;
    this.permissionOverride = options.permission ?? previousPermission;

    try {
      const response = session.prompt(prompt, {
        cancellationSignal: options.cancellationSignal,
      });
      response.catch(() => {
        // The ActiveSession queue surfaces this rejection through nextUpdate().
      });

      for (;;) {
        const message = await session.nextUpdate();
        messages.push(message);
        await this.options.onSessionUpdate?.(message);
        await options.onSessionUpdate?.(message);

        if (message.kind === "stop") {
          return {
            text,
            stopReason: message.stopReason,
            response: message.response,
            sessionId: session.sessionId,
            messages,
          };
        }

        const update = message.update;
        if (
          update.sessionUpdate === "agent_message_chunk" &&
          update.content.type === "text"
        ) {
          text += update.content.text;
          await options.onTextDelta?.(update.content.text);
          yield update.content.text;
        }
      }
    } finally {
      this.permissionOverride = previousPermission;
    }
  }

  async ask(input: string | CodexAskOptions): Promise<string> {
    const stream = this.streamAsk(input);
    let next = await stream.next();
    while (!next.done) {
      next = await stream.next();
    }
    return next.value;
  }

  async *streamAsk(
    input: string | CodexAskOptions
  ): AsyncGenerator<string, string> {
    const options = typeof input === "string" ? { prompt: input } : input;
    await this.createSession({ newSession: options.newSession ?? true });
    await this.setMode(options.mode ?? "read-only");
    const stream = this.streamPrompt({
      ...options,
      newSession: false,
      permission: options.permission ?? "reject_once",
    });
    let next = await stream.next();
    while (!next.done) {
      yield next.value;
      next = await stream.next();
    }
    return next.value.text;
  }

  async generateText(
    input:
      | string
      | (Omit<CodexPromptOptions, "prompt"> & { prompt: CodexPromptInput })
  ): Promise<string> {
    const result = await this.prompt(
      typeof input === "string" ? { prompt: input } : input
    );
    return result.text;
  }

  async closeSession(): Promise<void> {
    const session = this.session;
    if (!session) return;
    this.session = null;

    try {
      const connection = this.connection;
      if (connection && !connection.signal.aborted) {
        await connection.agent.request(acp.methods.agent.session.close, {
          sessionId: session.sessionId,
        });
      }
    } finally {
      session.dispose();
    }
  }

  async close(): Promise<void> {
    try {
      await this.closeSession();
    } catch {
      this.session?.dispose();
      this.session = null;
    }

    const connection = this.connection;
    this.connection = null;
    connection?.close();

    const child = this.child;
    this.child = null;
    if (!child) return;

    child.stdin?.end();
    if (child.exitCode === null && child.signalCode === null) {
      child.kill();
    }
  }

  private async openConnection(): Promise<acp.ClientConnection> {
    const command = this.options.command
      ? { command: this.options.command, args: this.options.args ?? [] }
      : resolveCodexAcpCommand();

    const child = spawn(command.command, command.args, {
      env: this.createEnv(),
      stdio: ["pipe", "pipe", this.options.stderr ?? "pipe"],
    });

    if (!child.stdin || !child.stdout) {
      child.kill();
      throw new Error("Failed to open stdio streams for codex-acp");
    }

    this.child = child;
    child.once("exit", (code, signal) => {
      if (this.child === child) {
        this.child = null;
        this.session = null;
        this.connection?.close(
          new Error(`codex-acp exited with code ${code} and signal ${signal}`)
        );
        this.connection = null;
      }
    });

    if (child.stderr && this.options.onStderr) {
      child.stderr.on("data", (chunk: Buffer) => {
        this.options.onStderr?.(chunk.toString());
      });
    }

    const app = this.createClientApp();
    const stream = acp.ndJsonStream(
      Writable.toWeb(child.stdin) as WritableStream<Uint8Array>,
      Readable.toWeb(child.stdout) as unknown as ReadableStream<Uint8Array>
    );
    const connection = app.connect(stream);
    this.connection = connection;

    await connection.agent.request(acp.methods.agent.initialize, {
      protocolVersion: acp.PROTOCOL_VERSION,
      clientCapabilities: this.createClientCapabilities(),
      clientInfo: {
        name: this.options.clientName ?? "@taskwish/ai",
        version: this.options.clientVersion ?? "0.0.0",
      },
    });

    return connection;
  }

  private createClientApp(): acp.ClientApp {
    let app = acp
      .client({ name: this.options.clientName ?? "@taskwish/ai" })
      .onRequest(acp.methods.client.session.requestPermission, (ctx) =>
        this.handlePermission(ctx.params)
      );

    if (this.options.readTextFile) {
      app = app.onRequest(
        acp.methods.client.fs.readTextFile,
        async (ctx) => await this.options.readTextFile!(ctx.params)
      );
    }

    if (this.options.writeTextFile) {
      app = app.onRequest(acp.methods.client.fs.writeTextFile, async (ctx) => {
        return (await this.options.writeTextFile!(ctx.params)) ?? {};
      });
    }

    return app;
  }

  private createClientCapabilities(): acp.ClientCapabilities {
    return {
      session: {
        configOptions: {
          boolean: {},
        },
      },
      fs:
        this.options.readTextFile || this.options.writeTextFile
          ? {
              readTextFile: Boolean(this.options.readTextFile),
              writeTextFile: Boolean(this.options.writeTextFile),
            }
          : undefined,
      plan: {},
      ...this.options.clientCapabilities,
    };
  }

  private createEnv(): Record<string, string> {
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (typeof value === "string") env[key] = value;
    }
    for (const [key, value] of Object.entries(this.options.env ?? {})) {
      if (typeof value === "string") env[key] = value;
      else delete env[key];
    }

    const config = {
      ...readJsonObject(env.CODEX_CONFIG),
      ...this.options.codexConfig,
      ...(this.options.model ? { model: this.options.model } : {}),
    };

    if (Object.keys(config).length > 0) {
      env.CODEX_CONFIG = JSON.stringify(config);
    }

    if (this.options.codexPath) env.CODEX_PATH = this.options.codexPath;
    if (this.options.modelProvider)
      env.MODEL_PROVIDER = this.options.modelProvider;
    if (this.options.defaultAuthRequest) {
      env.DEFAULT_AUTH_REQUEST = JSON.stringify(
        this.options.defaultAuthRequest
      );
    }
    if (this.options.initialAgentMode) {
      env.INITIAL_AGENT_MODE = this.options.initialAgentMode;
    }
    if (this.options.noBrowser) env.NO_BROWSER = "1";
    if (this.options.appServerLogs)
      env.APP_SERVER_LOGS = this.options.appServerLogs;

    return env;
  }

  private async applySessionDefaults(sessionId: acp.SessionId): Promise<void> {
    const connection = await this.connect();

    if (this.options.model) {
      await connection.agent.request(
        acp.methods.agent.session.setConfigOption,
        {
          sessionId,
          configId: CodexAcpConfig.model,
          value: this.options.model,
        }
      );
    }

    if (this.options.reasoningEffort) {
      await connection.agent.request(
        acp.methods.agent.session.setConfigOption,
        {
          sessionId,
          configId: CodexAcpConfig.reasoningEffort,
          value: this.options.reasoningEffort,
        }
      );
    }
  }

  private async handlePermission(
    request: acp.RequestPermissionRequest
  ): Promise<acp.RequestPermissionResponse> {
    const permission =
      this.permissionOverride ?? this.options.permission ?? "reject_once";
    if (typeof permission === "function") return permission(request);
    if (permission === "cancel") return { outcome: { outcome: "cancelled" } };

    const option =
      request.options.find((candidate) => candidate.kind === permission) ??
      request.options.find((candidate) => candidate.kind.startsWith("reject"));

    if (!option) return { outcome: { outcome: "cancelled" } };
    return {
      outcome: {
        outcome: "selected",
        optionId: option.optionId,
      },
    };
  }

  private withInstructions(
    prompt: CodexPromptInput,
    instructions: string | undefined
  ): CodexPromptInput {
    const prefix = (instructions ?? this.options.instructions)?.trim();
    if (!prefix) return prompt;

    if (typeof prompt === "string") return `${prefix}\n\n${prompt}`;
    const blocks = Array.isArray(prompt) ? prompt : [prompt];
    return [{ type: "text", text: prefix }, ...blocks];
  }
}

export function createCodexAgent(options: CodexAgentOptions = {}): CodexAgent {
  return new CodexAgent(options);
}

function normalizePromptOptions(
  input: CodexPromptInput | CodexPromptOptions
): CodexPromptOptions {
  if (typeof input === "string" || Array.isArray(input) || "type" in input) {
    return { prompt: input };
  }
  return input;
}

function readJsonObject(value: string | undefined): JsonObject {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as JsonObject;
    }
  } catch {
    return {};
  }
  return {};
}
