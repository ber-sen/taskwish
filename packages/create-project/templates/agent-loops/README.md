# TaskWish agent loops

Eighteen loop actors demonstrating common agent architectures with TaskWish
and the AI SDK. A supporting `GitHub` actor emits the real TaskWish event used
by `EventDrivenLoop`.

```sh
bun install
ollama pull qwen3:4b
ollama serve
```

Then, in another terminal:

```sh
bun start
```

All agents use `ollama/qwen3:4b` from the shared AI scope and connect to the
local Ollama server at `http://127.0.0.1:11434/v1`. Override the endpoint when
needed:

```sh
OLLAMA_BASE_URL=http://127.0.0.1:11434/v1 bun start
```

```ts
export const { Ollama } = Provider("Ollama", {
  baseURL: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/v1",
  models: ["qwen3:4b"],
});

export const { actor } = Actor("MyAgent").use(Ollama);
```

The Playwright end-to-end tests start the console locally and mock every agent
loop with a complete ACP event stream, so no model or API key is needed. They
validate each command payload, its actor-specific response, and the rendered ACP
message, thought, tool, plan, lifecycle, usage, compaction, and stop events:

```sh
bunx playwright install chromium
bun run test:e2e
```

Open the generated HTML report with:

```sh
bunx playwright show-report
```

The existing AI SDK agent runtime connects to Ollama through its OpenAI-compatible
API and continues to publish the same ACP lifecycle events. Each actor directory
contains its own `<service-name>.test.ts`; run all of them with `bun test`.

To run the application on Node.js 20+, use `npm install` followed by
`npm run start:node`. Tests continue to use Bun's built-in test runner.

| Actor                      | Loop                                              |
| -------------------------- | ------------------------------------------------- |
| `BasicAgentLoop`           | Observe → Think → Act                             |
| `ReActLoop`                | Reason → Act → Observe → repeat                   |
| `ToolCallingLoop`          | Model → Tool → Result → Model                     |
| `PlanExecuteLoop`          | Plan → Execute                                    |
| `PlanExecuteReplanLoop`    | Plan → Execute → Replan                           |
| `ReflectionLoop`           | Generate → Critique → Improve                     |
| `EvaluatorOptimizerLoop`   | Generate → Evaluate → Optimize                    |
| `RetryErrorCorrectionLoop` | Act → Error → Fix → Retry                         |
| `EnvironmentLoop`          | Observe environment → Act → Observe changes       |
| `EventDrivenLoop`          | `GitHub::IssueOpened` → Decide → Act → next event |
| `GoalDrivenLoop`           | Repeatedly act until a goal is satisfied          |
| `MultiAgentLoop`           | Agent A → Agent B → Agent A → …                   |
| `SupervisorWorkerLoop`     | Delegate → Execute → Evaluate                     |
| `DebateLoop`               | Propose → Challenge → Judge                       |
| `SelfAskLoop`              | Ask sub-question → Research → repeat              |
| `TreeSearchLoop`           | Generate branches → Evaluate → explore best path  |
| `MemoryLoop`               | Retrieve → Reason → Act → Store                   |
| `HumanInTheLoop`           | Propose → request approval → continue             |

The `GitHub` actor exposes `POST /integrations/github/issues` as a TaskWish HTTP
endpoint. Send GitHub `issues` webhook payloads to it using the TaskWish API key
printed at startup; an `opened` payload emits `GitHub::IssueOpened` and invokes
`EventDrivenLoop.onGitHubIssueOpened`.

Run `GitHub.pushBranchAndCreatePullRequest` to push a local branch and create a
pull request with `GITHUB_TOKEN`. Set `GITHUB_API_URL` only when using GitHub
Enterprise. The human-in-the-loop example returns a proposal on its first call;
pass that proposal back with a decision on the next call to approve or reject it.
