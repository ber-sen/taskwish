import {
  ToolLoopAgent as AiSdkToolLoopAgent,
  tool as aiSdkTool,
  type LanguageModel,
  type ModelMessage,
  type ToolSet,
  type ToolLoopAgentSettings,
} from "ai";

import {
  ToolDefinition,
  type TaskWishTool,
} from "./tool";

export type AiSdkAgentOptions = Omit<
  ToolLoopAgentSettings<never, ToolSet>,
  "id" | "model" | "tools"
> & {
  runtime?: "ai-sdk";
  name?: string;
  model: LanguageModel | (string & {});
  tools?: readonly string[];
};

export type AiSdkChatThread = {
  sessionId: string;
};

export class AiSdkAgent {
  readonly runtime = "ai-sdk" as const;
  readonly name: string;
  readonly client: AiSdkToolLoopAgent;

  private readonly sessions = new Map<string, ModelMessage[]>();

  constructor(
    options: AiSdkAgentOptions,
    tools: Record<string, TaskWishTool> = {},
  ) {
    const {
      runtime: _runtime,
      name = "agent",
      tools: _toolNames,
      ...settings
    } = options;

    this.name = name;
    this.client = new AiSdkToolLoopAgent({
      ...settings,
      id: name,
      model: options.model as LanguageModel,
      tools: toAiSdkTools(tools),
    } as never);
  }

  async generateText(prompt: string): Promise<string> {
    const result = await this.client.generate({ prompt });
    return result.text;
  }

  async *streamPrompt(prompt: string): AsyncGenerator<string, string> {
    const result = await this.client.stream({ prompt });
    let text = "";

    for await (const chunk of result.textStream) {
      text += chunk;
      yield chunk;
    }

    return text;
  }

  async createChatSession(): Promise<AiSdkChatThread> {
    const sessionId = crypto.randomUUID();
    this.sessions.set(sessionId, []);
    return { sessionId };
  }

  async *streamChatMessage(input: {
    sessionId: string;
    content: string;
  }): AsyncGenerator<string, string> {
    const history = this.sessions.get(input.sessionId);
    if (!history) {
      throw new Error(`Unknown agent chat session: ${input.sessionId}`);
    }

    const userMessage: ModelMessage = {
      role: "user",
      content: input.content,
    };
    const result = await this.client.stream({
      messages: [...history, userMessage],
    });
    let text = "";

    for await (const chunk of result.textStream) {
      text += chunk;
      yield chunk;
    }

    const responseMessages = await result.responseMessages;
    this.sessions.set(input.sessionId, [
      ...history,
      userMessage,
      ...(responseMessages as ModelMessage[]),
    ]);
    return text;
  }

  async close(): Promise<void> {
    this.sessions.clear();
  }
}

function toAiSdkTools(tools: Record<string, TaskWishTool>): ToolSet {
  return Object.fromEntries(
    Object.entries(tools).map(([name, taskwishTool]) => {
      const definition = taskwishTool[ToolDefinition];
      return [
        name,
        aiSdkTool({
          description: definition.description,
          inputSchema: definition.inputSchema,
          execute: (input) => taskwishTool(input),
        }),
      ];
    }),
  );
}
