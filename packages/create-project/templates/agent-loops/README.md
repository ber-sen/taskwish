# TaskWish agent loops

Eighteen loop actors demonstrating common agent architectures with TaskWish
and the AI SDK. A supporting `GitHub` actor emits the real TaskWish event used
by `EventDrivenLoop`.

```sh
bun install
export AI_GATEWAY_API_KEY=your-key
export GITHUB_TOKEN=your-github-token
bun start
```

Each `Agent(...)` hardcodes `model: "openai/gpt-5-mini"`. Configure
`AI_GATEWAY_API_KEY` for the AI SDK's default Vercel AI Gateway provider.
Each actor directory contains its own `<service-name>.test.ts`; run all of them with
`bun test`.

| Actor | Loop |
| --- | --- |
| `BasicAgentLoop` | Observe → Think → Act |
| `ReActLoop` | Reason → Act → Observe → repeat |
| `ToolCallingLoop` | Model → Tool → Result → Model |
| `PlanExecuteLoop` | Plan → Execute |
| `PlanExecuteReplanLoop` | Plan → Execute → Replan |
| `ReflectionLoop` | Generate → Critique → Improve |
| `EvaluatorOptimizerLoop` | Generate → Evaluate → Optimize |
| `RetryErrorCorrectionLoop` | Act → Error → Fix → Retry |
| `EnvironmentLoop` | Observe environment → Act → Observe changes |
| `EventDrivenLoop` | `GitHub::IssueOpened` → Decide → Act → next event |
| `GoalDrivenLoop` | Repeatedly act until a goal is satisfied |
| `MultiAgentLoop` | Agent A → Agent B → Agent A → … |
| `SupervisorWorkerLoop` | Delegate → Execute → Evaluate |
| `DebateLoop` | Propose → Challenge → Judge |
| `SelfAskLoop` | Ask sub-question → Research → repeat |
| `TreeSearchLoop` | Generate branches → Evaluate → explore best path |
| `MemoryLoop` | Retrieve → Reason → Act → Store |
| `HumanInTheLoop` | Propose → request approval → continue |

The `GitHub` actor exposes `POST /integrations/github/issues` as a TaskWish HTTP
endpoint. Send GitHub `issues` webhook payloads to it using the TaskWish API key
printed at startup; an `opened` payload emits `GitHub::IssueOpened` and invokes
`EventDrivenLoop.onGitHubIssueOpened`.

Run `GitHub.pushBranchAndCreatePullRequest` to push a local branch and create a
pull request with `GITHUB_TOKEN`. Set `GITHUB_API_URL` only when using GitHub
Enterprise. The human-in-the-loop example returns a proposal on its first call;
pass that proposal back with a decision on the next call to approve or reject it.
