import type { Page, Request } from "@playwright/test";

type MockCall = { actor: string; action: string; input: unknown };

export const MOCK_AGENT_RESPONSES = {
  BasicAgentLoop: "Mocked BasicAgentLoop response: next action selected.",
  DebateLoop: "Mocked DebateLoop response: arguments judged.",
  EnvironmentLoop: "Mocked EnvironmentLoop response: target reached.",
  EvaluatorOptimizerLoop:
    "Mocked EvaluatorOptimizerLoop response: output optimized.",
  GoalDrivenLoop: "Mocked GoalDrivenLoop response: goal completed.",
  HumanInTheLoop: "Mocked HumanInTheLoop response: approval requested.",
  MemoryLoop: "Mocked MemoryLoop response: memory stored.",
  MultiAgentLoop: "Mocked MultiAgentLoop response: consensus reached.",
  PlanExecuteLoop: "Mocked PlanExecuteLoop response: plan executed.",
  PlanExecuteReplanLoop:
    "Mocked PlanExecuteReplanLoop response: revised plan executed.",
  ReActLoop: "Mocked ReActLoop response: observation resolved.",
  ReflectionLoop: "Mocked ReflectionLoop response: draft improved.",
  RetryErrorCorrectionLoop:
    "Mocked RetryErrorCorrectionLoop response: error corrected.",
  SelfAskLoop: "Mocked SelfAskLoop response: subquestions answered.",
  SupervisorWorkerLoop: "Mocked SupervisorWorkerLoop response: work accepted.",
  ToolCallingLoop: "Mocked ToolCallingLoop response: tool result returned.",
  TreeSearchLoop: "Mocked TreeSearchLoop response: best branch selected.",
} as const;

export const LONG_STREAM_END =
  "This final sentence confirms that the complete streamed response reached the interface.";

function fakeResponse(actor: string, input: unknown): unknown {
  return (
    MOCK_AGENT_RESPONSES[actor as keyof typeof MOCK_AGENT_RESPONSES] ?? {
      actor,
      mocked: true,
      input,
    }
  );
}

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function longAgentResponse(actor: string, input: unknown): string {
  const summary = fakeResponse(actor, input);
  return [
    typeof summary === "string" ? summary : JSON.stringify(summary),
    `The ${actor} agent is producing a deliberately long mocked answer so the end-to-end test exercises incremental rendering. It reviews the supplied request, identifies the important constraints, and explains how the proposed result follows from the available context.`,
    "The response continues across several ACP message chunks. This lets Playwright verify that the console combines chunks with the same message identifier instead of displaying disconnected fragments or losing text while the action is running.",
    "A realistic response may contain several paragraphs, implementation details, caveats, and a concise recommendation. The mock remains deterministic, requires no model credentials, and is long enough to exercise scrolling and Markdown rendering in the result drawer.",
    LONG_STREAM_END,
  ].join("\n\n");
}

function textChunks(value: string, size = 72): string[] {
  const chunks: string[] = [];
  for (let offset = 0; offset < value.length; offset += size) {
    chunks.push(value.slice(offset, offset + size));
  }
  return chunks;
}

function acpResponse(actor: string, input: unknown): string {
  const response = longAgentResponse(actor, input);
  const sessionId = `mock-${actor}`;
  const notification = (update: Record<string, unknown>) => ({
    sessionId,
    update,
  });
  return [
    sseEvent(
      "ACP::UserMessageChunk",
      notification({
        sessionUpdate: "user_message_chunk",
        content: { type: "text", text: JSON.stringify(input) },
      })
    ),
    sseEvent(
      "ACP::AgentThoughtChunk",
      notification({
        sessionUpdate: "agent_thought_chunk",
        messageId: "thought-1",
        content: { type: "text", text: `Mocked ${actor} reasoning.` },
      })
    ),
    sseEvent(
      "ACP::ToolCall",
      notification({
        sessionUpdate: "tool_call",
        toolCallId: "tool-1",
        title: "Mock tool",
        status: "pending",
      })
    ),
    sseEvent(
      "ACP::ToolCallUpdate",
      notification({
        sessionUpdate: "tool_call_update",
        toolCallId: "tool-1",
        title: "Mock tool",
        status: "completed",
        rawOutput: `Mocked ${actor} tool output.`,
      })
    ),
    sseEvent(
      "ACP::Plan",
      notification({ sessionUpdate: "plan", entries: ["Mock plan"] })
    ),
    sseEvent(
      "ACP::PlanUpdate",
      notification({
        sessionUpdate: "plan_update",
        entries: ["Mock plan updated"],
      })
    ),
    sseEvent(
      "ACP::PlanRemoved",
      notification({ sessionUpdate: "plan_removed", planId: "plan-1" })
    ),
    ...[
      ["AvailableCommandsUpdate", "available_commands_update"],
      ["CurrentModeUpdate", "current_mode_update"],
      ["ConfigOptionUpdate", "config_option_update"],
      ["SessionInfoUpdate", "session_info_update"],
      ["UsageUpdate", "usage_update"],
      ["CompactionUpdate", "compaction_update"],
      ["CompactionSummaryChunk", "compaction_summary_chunk"],
    ].map(([message, sessionUpdate]) =>
      sseEvent(
        `ACP::${message}`,
        notification({
          sessionUpdate,
          used: sessionUpdate === "usage_update" ? 42 : undefined,
        })
      )
    ),
    ...textChunks(response).map((text) =>
      sseEvent(
        "ACP::AgentMessageChunk",
        notification({
          sessionUpdate: "agent_message_chunk",
          messageId: "message-1",
          content: { type: "text", text },
        })
      )
    ),
    sseEvent("ACP::Stop", { response, stopReason: "end_turn" }),
    sseEvent("TW::Result", response),
  ].join("");
}

function actionParts(request: Request): Pick<MockCall, "actor" | "action"> {
  const parts = new URL(request.url()).pathname.split("/").filter(Boolean);
  const tw = parts.indexOf("tw");
  return {
    actor: decodeURIComponent(parts[tw + 1] ?? "UnknownActor"),
    action: decodeURIComponent(parts[tw + 2] ?? "unknown-action"),
  };
}

export async function installMockAgentServer(page: Page) {
  const calls: MockCall[] = [];
  await page.route("**/tw/**", async (route) => {
    const request = route.request();
    if (request.method() !== "POST") return route.continue();
    const { actor, action } = actionParts(request);
    const input = request.postDataJSON();
    calls.push({ actor, action, input });
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream; charset=utf-8",
      body: acpResponse(actor, input),
    });
  });
  return {
    calls,
    callFor(actor: string) {
      return calls.find((call) => call.actor === actor);
    },
  };
}
