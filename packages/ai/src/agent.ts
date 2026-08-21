import { TW } from "@taskwish/core";
import {
  CodexAgent,
  type CodexAgentOptions,
  type CodexAskOptions,
  type CodexPromptInput,
  type CodexPromptOptions,
} from "./codex-agent";
import type { CamelCase } from "./helpers";

type AgentProvider = "codex";
type AgentName = "agent";

export type AgentOptions = CodexAgentOptions & {
  provider: AgentProvider;
  name?: string;
};

export type AgentOptionsFactory<Scope = any> = (scope: Scope) => AgentOptions;

export interface AgentRuntime {
  readonly name: string;
  readonly provider: AgentProvider;
  readonly client: CodexAgent;
  ask(input?: string | CodexAskOptions): AsyncGenerator<string, string>;
  message(content: string): AsyncGenerator<string, string>;
  message(threadId: string, content: string): AsyncGenerator<string, string>;
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
          provider:
            (second as { provider?: AgentProvider } | undefined)?.provider ??
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

    if (!options || options.provider !== "codex") {
      throw new Error('Agent provider must be "codex".');
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
  const client = new CodexAgent(options);
  const threadClients = new Map<string, CodexAgent>();

  const clientForThread = (threadId: string | undefined) => {
    if (!threadId) return client;

    let threadClient = threadClients.get(threadId);
    if (!threadClient) {
      threadClient = new CodexAgent(options);
      threadClients.set(threadId, threadClient);
    }
    return threadClient;
  };

  return {
    name: options.name ?? "agent",
    provider: "codex",
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

    async *message(input: string, content?: string) {
      const { threadId, promptOptions } = normalizeMessageOptions(
        input,
        content,
      );
      const stream = clientForThread(threadId).streamPrompt(promptOptions);
      let next = await stream.next();
      while (!next.done) {
        yield next.value;
        next = await stream.next();
      }
      return next.value.text;
    },

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
        ...Array.from(threadClients.values()).map((threadClient) =>
          threadClient.close(),
        ),
      ]);
      threadClients.clear();
    },
  };
}

function normalizePrompt<T>(input: T | undefined): T | string {
  if (input !== undefined) return input;
  throw new Error("Agent prompt is required.");
}

function normalizeMessageOptions(
  input: string,
  content?: string,
): {
  threadId?: string;
  promptOptions: CodexPromptOptions;
} {
  if (content !== undefined) {
    return { threadId: input, promptOptions: { prompt: content } };
  }

  if (typeof input !== "string") {
    throw new Error("Agent message content is required.");
  }
  return { promptOptions: { prompt: input } };
}
