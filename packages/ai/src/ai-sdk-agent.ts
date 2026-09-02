import {
  ToolLoopAgent as AiSdkToolLoopAgent,
  tool as aiSdkTool,
  type LanguageModel,
  type ModelMessage,
  type OnFinishEvent,
  type OnStepFinishEvent,
  type TextStreamPart,
  type ToolExecutionEndEvent,
  type ToolExecutionStartEvent,
  type ToolSet,
  type ToolLoopAgentSettings,
} from "ai";
import {
  AcpStop,
  acpSessionUpdateMessage,
  type AcpSessionMessage,
  type AcpSessionNotification,
  type AcpSessionUpdate,
} from "@taskwish/wire";

import { ToolDefinition, type TaskWishTool } from "./tool";

/** A concrete AI SDK model implementation, excluding its global string catalog. */
export type TaskWishLanguageModel = Exclude<LanguageModel, string>;

export type AiSdkAgentOptions = Omit<
  ToolLoopAgentSettings<never, ToolSet>,
  "id" | "model" | "tools"
> & {
  runtime?: "ai-sdk";
  name?: string;
  model: TaskWishLanguageModel | (string & {});
  tools?: readonly string[];
};

export type AiSdkChatThread = {
  sessionId: string;
};

export type AiSdkWireMessage = AcpSessionMessage | AcpStop;
export type AiSdkWireObserver = (message: AiSdkWireMessage) => void;

export class AiSdkAgent {
  readonly runtime = "ai-sdk" as const;
  readonly name: string;
  readonly client: AiSdkToolLoopAgent;

  private readonly sessions = new Map<string, ModelMessage[]>();

  constructor(
    options: AiSdkAgentOptions,
    tools: Record<string, TaskWishTool> = {},
    private readonly onWireMessage?: AiSdkWireObserver
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
    const sessionId = crypto.randomUUID();
    this.publishUpdate(sessionId, {
      sessionUpdate: "user_message_chunk",
      content: { type: "text", text: prompt },
    });
    const result = await this.client.generate({
      prompt,
      onToolExecutionStart: (event) => this.publishToolStart(sessionId, event),
      onToolExecutionEnd: (event) => this.publishToolEnd(sessionId, event),
      onStepEnd: (event) => this.publishStep(sessionId, event),
      onEnd: (event) => this.publishEnd(sessionId, event),
    });
    return result.text;
  }

  async *streamPrompt(prompt: string): AsyncGenerator<string, string> {
    const stream = this.stream({ prompt }, crypto.randomUUID(), prompt);
    let text = "";
    for await (const chunk of stream) {
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
    const result = this.stream(
      { messages: [...history, userMessage] },
      input.sessionId,
      input.content
    );
    let text = "";
    let next = await result.next();
    while (!next.done) {
      text += next.value;
      yield next.value;
      next = await result.next();
    }

    const responseMessages = await next.value.responseMessages;
    this.sessions.set(input.sessionId, [
      ...history,
      userMessage,
      ...(responseMessages as ModelMessage[]),
    ]);
    return text;
  }

  private async *stream(
    input: Parameters<AiSdkToolLoopAgent["stream"]>[0],
    sessionId: string,
    prompt: string
  ): AsyncGenerator<string, Awaited<ReturnType<AiSdkToolLoopAgent["stream"]>>> {
    this.publishUpdate(sessionId, {
      sessionUpdate: "user_message_chunk",
      content: { type: "text", text: prompt },
    });

    const result = await this.client.stream(input);
    const toolInputs = new Map<string, string>();

    for await (const part of result.fullStream) {
      const text = this.publishStreamPart(sessionId, part, toolInputs);
      if (text !== undefined) yield text;
    }

    return result;
  }

  private publishStreamPart(
    sessionId: string,
    part: TextStreamPart<ToolSet>,
    toolInputs: Map<string, string>
  ): string | undefined {
    switch (part.type) {
      case "text-delta":
        this.publishUpdate(sessionId, {
          sessionUpdate: "agent_message_chunk",
          messageId: part.id,
          content: { type: "text", text: part.text },
        });
        return part.text;
      case "reasoning-delta":
        this.publishUpdate(sessionId, {
          sessionUpdate: "agent_thought_chunk",
          messageId: part.id,
          content: { type: "text", text: part.text },
        });
        return;
      case "tool-input-start":
        toolInputs.set(part.id, "");
        this.publishUpdate(sessionId, {
          sessionUpdate: "tool_call",
          toolCallId: part.id,
          title: part.title ?? part.toolName,
          name: part.toolName,
          kind: "other",
          status: "pending",
        });
        return;
      case "tool-input-delta": {
        const rawInput = `${toolInputs.get(part.id) ?? ""}${part.delta}`;
        toolInputs.set(part.id, rawInput);
        this.publishUpdate(sessionId, {
          sessionUpdate: "tool_call_update",
          toolCallId: part.id,
          status: "pending",
          rawInput,
        });
        return;
      }
      case "tool-call":
        this.publishUpdate(sessionId, {
          sessionUpdate: "tool_call_update",
          toolCallId: part.toolCallId,
          title: part.title ?? part.toolName,
          name: part.toolName,
          status: "in_progress",
          rawInput: part.input,
        });
        return;
      case "tool-result":
        this.publishUpdate(sessionId, {
          sessionUpdate: "tool_call_update",
          toolCallId: part.toolCallId,
          title: part.title ?? part.toolName,
          name: part.toolName,
          status: part.preliminary ? "in_progress" : "completed",
          rawOutput: part.output,
        });
        return;
      case "tool-error":
        this.publishUpdate(sessionId, {
          sessionUpdate: "tool_call_update",
          toolCallId: part.toolCallId,
          title: part.title ?? part.toolName,
          name: part.toolName,
          status: "failed",
          rawOutput: serializableError(part.error),
        });
        return;
      case "finish": {
        const used =
          (part.totalUsage.inputTokens ?? 0) +
          (part.totalUsage.outputTokens ?? 0);
        this.publishUpdate(sessionId, {
          sessionUpdate: "usage_update",
          used,
          // AI SDK exposes token usage but not the provider context-window size.
          size: used,
          _meta: {
            runtime: "ai-sdk",
            contextWindowSizeUnavailable: true,
            usage: part.totalUsage,
          },
        });
        this.publishStop(sessionId, finishReason(part.finishReason));
        return;
      }
      case "abort":
        this.publishStop(sessionId, "cancelled");
        return;
      case "error":
        throw part.error;
      default:
        return;
    }
  }

  private publishToolStart(
    sessionId: string,
    event: ToolExecutionStartEvent
  ): void {
    const call = event.toolCall;
    this.publishUpdate(sessionId, {
      sessionUpdate: "tool_call",
      toolCallId: call.toolCallId,
      title: call.title ?? call.toolName,
      name: call.toolName,
      kind: "other",
      status: "in_progress",
      rawInput: call.input,
    });
  }

  private publishToolEnd(
    sessionId: string,
    event: ToolExecutionEndEvent
  ): void {
    const call = event.toolCall;
    const output = event.toolOutput;
    this.publishUpdate(sessionId, {
      sessionUpdate: "tool_call_update",
      toolCallId: call.toolCallId,
      title: call.title ?? call.toolName,
      name: call.toolName,
      status: output.type === "tool-error" ? "failed" : "completed",
      rawOutput:
        output.type === "tool-error"
          ? serializableError(output.error)
          : output.output,
    });
  }

  private publishStep(sessionId: string, event: OnStepFinishEvent): void {
    event.content.forEach((part, index) => {
      const messageId = `${event.callId}:${event.stepNumber}:${index}`;
      if (part.type === "text") {
        this.publishUpdate(sessionId, {
          sessionUpdate: "agent_message_chunk",
          messageId,
          content: { type: "text", text: part.text },
        });
      } else if (part.type === "reasoning") {
        this.publishUpdate(sessionId, {
          sessionUpdate: "agent_thought_chunk",
          messageId,
          content: { type: "text", text: part.text },
        });
      }
    });
  }

  private publishEnd(sessionId: string, event: OnFinishEvent): void {
    const used =
      (event.totalUsage.inputTokens ?? 0) +
      (event.totalUsage.outputTokens ?? 0);
    this.publishUpdate(sessionId, {
      sessionUpdate: "usage_update",
      used,
      // AI SDK exposes token usage but not the provider context-window size.
      size: used,
      _meta: {
        runtime: "ai-sdk",
        contextWindowSizeUnavailable: true,
        usage: event.totalUsage,
      },
    });
    this.publishStop(sessionId, finishReason(event.finishReason));
  }

  private publishUpdate(sessionId: string, update: AcpSessionUpdate): void {
    this.onWireMessage?.(
      acpSessionUpdateMessage({ sessionId, update } as AcpSessionNotification)
    );
  }

  private publishStop(sessionId: string, stopReason: string): void {
    this.onWireMessage?.(new AcpStop({ response: { sessionId }, stopReason }));
  }

  async close(): Promise<void> {
    this.sessions.clear();
  }
}

function finishReason(reason: string): string {
  switch (reason) {
    case "length":
      return "max_tokens";
    case "content-filter":
      return "refusal";
    default:
      return "end_turn";
  }
}

function serializableError(error: unknown): unknown {
  return error instanceof Error ? { message: error.message } : error;
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
    })
  );
}
