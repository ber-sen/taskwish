# TaskWish agent graphs

Six graph actors demonstrating common agent workflow topologies with TaskWish
and the AI SDK.

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

| Actor | Graph | Use when |
| --- | --- | --- |
| `SequentialGraph` | Research → Write → Edit | The stages and their order are known |
| `RoutingGraph` | Classify → one specialist | Inputs fall into reliable, distinct categories |
| `ParallelGraph` | Fan out → independent reviewers → fan in | Independent perspectives improve speed or confidence |
| `MapReduceGraph` | Plan → dynamic workers → reduce | The number of independent subtasks is discovered at runtime |
| `HierarchicalGraph` | Manager → leads → specialists → manager | Work benefits from layered delegation and aggregation |
| `FallbackGraph` | Primary → validate → accept or fallback | A fast path needs a guarded recovery branch |

These examples keep control flow in code and use agents only at nodes where
language-model judgment is useful. Each leaf has a clear input, and every join
explicitly combines its upstream results.

The selected patterns are grounded in the workflow catalogs from Anthropic and
LangGraph, directed-graph execution described by AutoGen GraphFlow, and the
code-driven orchestration guidance in the OpenAI Agents SDK:

- https://www.anthropic.com/engineering/building-effective-agents
- https://docs.langchain.com/oss/python/langgraph/workflows-agents
- https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/graph-flow.html
- https://openai.github.io/openai-agents-js/guides/multi-agent/

Each actor directory contains a colocated unit test with mocked agents, so the
test suite needs no model or API key:

```sh
bun test
```

To run the application on Node.js 20+, use `npm install` followed by
`npm run start:node`. Tests continue to use Bun's built-in test runner.
