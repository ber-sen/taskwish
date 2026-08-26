import { TW } from "@taskwish/core";
import {
  CodexAgent,
  type CodexAgentOptions,
  type CodexAskOptions,
  type CodexPromptInput,
  type CodexPromptOptions,
} from "./codex-agent";
import { FxAgent, type FxAgentOptions } from "./fx-agent";
import type { CamelCase } from "./helpers";

type AgentRuntimeKind = "codex" | "fx";
type AgentName = "agent";

type CodexAgentRuntimeOptions = CodexAgentOptions & {
  runtime: "codex";
  name?: string;
};

type FxAgentRuntimeOptions = FxAgentOptions & {
  runtime: "fx";
  name?: string;
};

export type AgentOptions = CodexAgentRuntimeOptions | FxAgentRuntimeOptions;

export type AgentOptionsFactory<Scope = any> = (scope: Scope) => AgentOptions;

export type AgentChatInput = {
  sessionId?: string;
  threadId?: string;
  content?: string;
};

export type AgentChatMessageInput = {
  content: string;
} & (
  | { sessionId: string; threadId?: string }
  | { threadId: string; sessionId?: string }
);

export type AgentChatThread = {
  threadId: string;
  sessionId: string;
};

export interface AgentRuntime {
  readonly name: string;
  readonly runtime: AgentRuntimeKind;
  readonly client: CodexAgent | FxAgent;
  ask(input?: string | CodexAskOptions): AsyncGenerator<string, string>;
  chat(): TW.Branch<
    { input: void },
    { threadId: string },
    Promise<AgentChatThread>
  >;
  chat<const Input extends AgentChatInput | void>(
    input: Input,
  ): Input extends void
    ? TW.Branch<
        { input: void },
        { threadId: string },
        Promise<AgentChatThread>
      >
    : Input extends AgentChatMessageInput
      ? TW.Branch<{ input: Input }, string, AsyncGenerator<string, string>>
      : TW.Branch<
          { input: Input },
          { threadId: string } | string,
          Promise<AgentChatThread> | AsyncGenerator<string, string>
        >;
  prompt(
    input?: CodexPromptInput | CodexPromptOptions,
  ): AsyncGenerator<string, string>;
  generate(options: { prompt: string }): Promise<string>;
  close(): Promise<void>;
}

type AgentStep<Ctx extends Record<any, any>> = {
  [TW.Step]: (input: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["steps"];
    step: Ctx["step"];
    scope: Record<AgentName, AgentRuntime> & Ctx["scope"];
    last: AgentRuntime;
    plugins: Ctx["plugins"];
  };
};

export function Agent<Ctx extends Record<any, any>>(
  options: AgentOptions,
): (() => AgentRuntime) & AgentStep<Ctx>;
export function Agent<Ctx extends Record<any, any>>(
  options: AgentOptionsFactory,
): (() => AgentRuntime) & AgentStep<Ctx>;
export function Agent<
  const Name extends string,
  const Tools extends string[],
  Ctx extends Record<any, any>,
>(
  name: CamelCase<Name>,
  options: Omit<AgentOptions, "name"> & {
    tools?: Tools;
  },
): (() => AgentRuntime) & AgentStep<Ctx>;
export function Agent(first: unknown, second?: unknown) {
  const configuredName = typeof first === "string" ? first : "agent";
  const optionsOrFactory: AgentOptions | AgentOptionsFactory =
    typeof first === "string"
      ? ({
          ...(second as Record<string, unknown> | undefined),
          runtime:
            (second as { runtime?: AgentRuntimeKind } | undefined)?.runtime ??
            "codex",
          name: first,
        } as AgentOptions)
      : (first as AgentOptions | AgentOptionsFactory);
  let runtime: AgentRuntime | null = null;

  function agentStep(this: unknown): AgentRuntime {
    if (runtime) return runtime;

    const scope = this;
    const options =
      typeof optionsOrFactory === "function"
        ? optionsOrFactory(scope)
        : optionsOrFactory;

    if (!options || (options.runtime !== "codex" && options.runtime !== "fx")) {
      throw new Error('Agent runtime must be "codex" or "fx".');
    }

    runtime = createAgentRuntime({
      ...options,
      name: options.name ?? configuredName,
    });
    return runtime;
  }

  return Object.assign(agentStep, {
    [TW.Name]: configuredName,
    [TW.Step]: (input: Record<string, unknown>) => {
      const agent = agentStep.call(input);
      return {
        ...input,
        scope: {
          ...(input.scope as Record<string, unknown>),
          agent,
        },
        last: agent,
      };
    },
  }) as never;
}

function createAgentRuntime(options: AgentOptions): AgentRuntime {
  const createClient =
    options.runtime === "fx"
      ? (opts: AgentOptions) => new FxAgent(opts as FxAgentOptions)
      : (opts: AgentOptions) => new CodexAgent(opts as CodexAgentOptions);
  const client = createClient(options);
  const sessionClients = new Map<string, CodexAgent>();

  function chat(): TW.Branch<
    { input: void },
    { threadId: string },
    Promise<AgentChatThread>
  >;
  function chat<const Input extends AgentChatInput | void>(
    input: Input,
  ): Input extends void
    ? TW.Branch<
        { input: void },
        { threadId: string },
        Promise<AgentChatThread>
      >
    : Input extends AgentChatMessageInput
      ? TW.Branch<{ input: Input }, string, AsyncGenerator<string, string>>
      : TW.Branch<
          { input: Input },
          { threadId: string } | string,
          Promise<AgentChatThread> | AsyncGenerator<string, string>
        >;
  function chat(input?: AgentChatInput | void) {
    if (!input?.content) {
      return createChatSession();
    }

    const threadId = input.threadId ?? input.sessionId;
    if (!threadId) {
      throw new Error("Agent chat threadId is required.");
    }

    return streamChatMessage({
      threadId,
      content: input.content,
    });
  }

  return {
    name: options.name ?? "agent",
    runtime: options.runtime,
    client,

    async *ask(input?: string | CodexAskOptions) {
      const prompt = normalizePrompt(input);
      const stream = client.streamAsk(
        typeof prompt === "string" || "prompt" in prompt ? prompt : { prompt },
      );
      let next = await stream.next();
      while (!next.done) {
        yield next.value;
        next = await stream.next();
      }
      return next.value;
    },

    chat,

    async *prompt(input?: CodexPromptInput | CodexPromptOptions) {
      const prompt = normalizePrompt(input);
      const stream = client.streamPrompt(
        typeof prompt === "string" || Array.isArray(prompt) || "type" in prompt
          ? { prompt }
          : prompt,
      );
      let next = await stream.next();
      while (!next.done) {
        yield next.value;
        next = await stream.next();
      }
      return next.value.text;
    },

    generate({ prompt }) {
      return client.generateText(prompt);
    },

    async close() {
      await Promise.all([
        client.close(),
        ...Array.from(sessionClients.values()).map((sessionClient) =>
          sessionClient.close(),
        ),
      ]);
      sessionClients.clear();
    },
  };

  async function createChatSession(): Promise<AgentChatThread> {
    const sessionClient = createClient(options);
    const session = await sessionClient.createSession({ newSession: true });
    sessionClients.set(session.sessionId, sessionClient);
    return { sessionId: session.sessionId, threadId: session.sessionId };
  }

  async function* streamChatMessage(message: {
    threadId: string;
    content: string;
  }): AsyncGenerator<string, string> {
    const sessionClient = sessionClients.get(message.threadId);
    if (!sessionClient) {
      throw new Error(`Unknown agent chat session: ${message.threadId}`);
    }

    const stream = sessionClient.streamPrompt({
      prompt: message.content,
      newSession: false,
    });
    let next = await stream.next();
    while (!next.done) {
      yield next.value;
      next = await stream.next();
    }
    return next.value.text;
  }
}

function normalizePrompt<T>(input: T | undefined): T | string {
  if (input !== undefined) return input;
  throw new Error("Agent prompt is required.");
}
