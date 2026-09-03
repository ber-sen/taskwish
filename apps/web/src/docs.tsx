"use client";

import { ArrowLeft, ArrowRight, BookOpen, Menu, X } from "lucide-react";
import { useState } from "react";
import { CodeBlock } from "./code-block";

type DocPage = { slug: string; title: string; description: string; content: React.ReactNode };

const createCommand = "bunx @taskwish/create-project";

const pages: DocPage[] = [
  {
    slug: "getting-started", title: "Getting started", description: "Create and run a local TaskWish service.",
    content: <>
      <h2>Requirements</h2><p>TaskWish projects run on <a href="https://bun.sh" target="_blank" rel="noreferrer">Bun</a>. The installer can install Bun for you, or you can use the package directly.</p>
      <CodeBlock title="Terminal" language="sh" code={`${createCommand}\ncd my-taskwish-app\nbun start`} />
      <h2>Choose a starter</h2><p>The interactive installer offers five templates: <code>empty</code>, <code>todo</code>, <code>agent-loops</code>, <code>agent-graphs</code>, and <code>software-factory</code>.</p>
      <CodeBlock title="Terminal" language="sh" code="bunx @taskwish/create-project my-app --template todo" />
      <h2>Your project</h2><p><code>taskwish.ts</code> starts the server. Each actor lives in its own folder with an actor definition, one file per action, an index that exports the service, and a colocated test.</p>
      <CodeBlock title="taskwish.ts" code={`import { Console } from "@taskwish/console";\nimport { Server } from "@taskwish/server";\nimport { Greeter } from "./src/greeter";\n\nawait Server("TaskWish Greeter", {\n  apps: [Console()],\n  workspace: [Greeter],\n});`} />
      <Callout>When the server starts, it prints its local URL and a generated API key. Open the URL to use Console.</Callout>
    </>,
  },
  {
    slug: "actors", title: "Actors & actions", description: "Define domain boundaries and callable, typed behavior.",
    content: <>
      <h2>Actor</h2><p>An actor owns one domain. Calling <code>Actor("Greeter")</code> creates a reusable actor factory. Define public behavior as actions and export the finished service.</p>
      <CodeBlock title="src/greeter/greeter.ts" code={`import { Actor } from "taskwish";\n\nexport const { actor } = Actor("Greeter");`} />
      <h2>Command actions</h2><p>Use <code>.on("Command", name)</code> for public actions. Inputs are runtime-validated and inferred inside every step. Metadata powers labels, descriptions, examples, and controls in Console.</p>
      <CodeBlock title="src/greeter/greet.ts" code={`import { Step } from "taskwish";\nimport { actor } from "./greeter";\n\nexport const { greet } = actor()\n  .on("Command", "greet")\n\n  .input({ name: "string" })\n\n  .run(\n    Step("createGreeting", function () {\n      return \`Hello, \${this.input.name.trim()}!\`;\n    }),\n  )\n\n  .meta({\n    description: "Greet a person by name",\n    input: { name: { example: "Ada" } },\n  });`} />
      <h2>Service export</h2><CodeBlock title="src/greeter/index.ts" code={`import { actor } from "./greeter";\nimport { greet } from "./greet";\n\nexport const { Greeter } = actor().service({ greet });`} />
    </>,
  },
  {
    slug: "steps", title: "Steps & composition", description: "Build readable pipelines from focused units of work.",
    content: <>
      <h2>Named steps</h2><p>A step is the atomic unit inside an action. Its return value is available to every later step on <code>this</code>, under the camel-cased step name.</p>
      <CodeBlock code={`.run(\n  Step("normalizeRequest", function () {\n    return this.input.request.trim();\n  }),\n\n  Step("createAnswer", function () {\n    return { answer: this.normalizeRequest.toUpperCase() };\n  }),\n);`} />
      <h2>Dependencies</h2><p>Use <code>.use(...)</code> to declare another service or provider. Call its actions through <code>this.actions</code>. This keeps dependencies explicit and easy to replace in tests.</p>
      <CodeBlock code={`export const { reviewChange } = actor()\n  .use(Slack, CodingAgent)\n\n  .on("Command", "reviewChange")\n\n  .input({ changeId: "string" })\n\n  .run(\n    Step("loadChange", function () {\n      return this.actions.codingAgent.getChange({\n        id: this.input.changeId,\n      });\n    }),\n\n    Step("notify", function () {\n      return this.actions.slack.postMessage({\n        text: \`Reviewed \${this.loadChange.title}\`,\n      });\n    }),\n  );`} />
      <h2>Control flow</h2><p>Use normal TypeScript for simple decisions and TaskWish composition primitives for observable workflow structure. Agent loop and graph starters demonstrate sequential, parallel, routing, map-reduce, retry, and human-in-the-loop patterns.</p>
    </>,
  },
  {
    slug: "state-and-events", title: "State & events", description: "Keep durable state with its owner and connect actors with typed events.",
    content: <>
      <h2>Scoped state</h2><p>Declare actor state in <code>.scope()</code>. Collections can generate their own primary IDs. Actions read and mutate state through <code>this.state</code>.</p>
      <CodeBlock title="src/todos/todos.ts" code={`import { Actor, Event, State } from "taskwish";\n\nexport const { actor } = Actor("Todos").scope(\n  Event("TodoCompleted", {\n    id: "string",\n    description: "string",\n  }),\n\n  State({\n    items: State.List({\n      id: "primary.uuidv4.random",\n      description: "string",\n      done: "boolean",\n    }),\n  }),\n);`} />
      <h2>Signal an event</h2><p>Events are qualified by their owning actor. Signal them from a step; subscribed actors receive a typed event payload.</p>
      <CodeBlock code={`Step("signalTodoCompleted", function () {\n  return this.signal("Todos::TodoCompleted", {\n    id: this.markComplete.id,\n    description: this.markComplete.description,\n  });\n});`} />
      <Callout>Events decouple actors. For direct coordination, declare a service with <code>.use()</code> and call it through <code>this.actions</code>.</Callout>
    </>,
  },
  {
    slug: "agents", title: "Agents & tools", description: "Place model reasoning inside typed, testable workflows.",
    content: <>
      <h2>Configure a provider</h2><p>Providers are ordinary actor dependencies. The included examples use a local OpenAI-compatible Ollama endpoint, but the workflow is not tied to one model host.</p>
      <CodeBlock code={`import { Actor, Provider } from "taskwish";\n\nexport const { Ollama } = Provider("Ollama", {\n  baseURL: process.env.OLLAMA_BASE_URL\n    ?? "http://127.0.0.1:11434/v1",\n  models: ["qwen3:4b"],\n});\n\nexport const { actor } = Actor("Researcher")\n  .use(Ollama);`} />
      <h2>Agent steps</h2><p>Agents can reason and call declared tools while deterministic steps prepare inputs, validate results, and produce side effects. Their streamed lifecycle is visible in Console.</p>
      <CodeBlock title="src/researcher/research.ts" code={`import { Agent, Step } from "taskwish";\nimport { actor } from "./researcher";\n\nexport const { research } = actor()\n  .on("Command", "research")\n\n  .input({ question: "string" })\n\n  .run(\n    Agent({\n      model: "ollama/qwen3:4b",\n      instructions: "Answer with concise, cited findings.",\n    }),\n\n    Step("answerQuestion", function () {\n      return this.agent.generate({ prompt: this.input.question });\n    }),\n  )\n\n  .meta({\n    description: "Research a question with a local model",\n  });`} />
      <h2>Start from a working architecture</h2><p>The <code>agent-loops</code> template includes 18 patterns such as ReAct, reflection, evaluator-optimizer, supervisor-worker, and human approval. The <code>agent-graphs</code> template includes six topologies for routing, parallel work, map-reduce, hierarchy, and fallback.</p>
      <CodeBlock title="Terminal" language="sh" code="bunx @taskwish/create-project my-agents --template agent-loops" />
      <Callout>Unit tests inject mock agents, so your test suite does not need a model server or API credentials.</Callout>
    </>,
  },
  {
    slug: "server-and-console", title: "Server, Console & MCP", description: "Run and inspect the complete workspace from one local process.",
    content: <>
      <h2>Server</h2><p><code>Server()</code> registers the services in your workspace, mounts applications, and starts a Bun server. By default it chooses an available local port and creates an API key.</p>
      <CodeBlock code={`import { Console } from "@taskwish/console";\nimport { Server } from "@taskwish/server";\n\nawait Server("My workspace", {\n  apps: [Console()],\n  workspace: [Todos, Researcher],\n  mcp: true,\n});`} />
      <h2>Console</h2><p>Console is a TaskWish server app. Use it to browse actors, inspect schemas and state, run actions, and follow streamed step and agent output.</p>
      <h2>MCP</h2><p>Set <code>mcp: true</code> to expose registered actions at the default MCP endpoint. For tighter control, specify endpoint paths and select only the actions that should become tools.</p>
      <CodeBlock code={`await Server("My workspace", {\n  workspace: [Todos],\n  mcp: {\n    path: "/mcp/todos",\n    tools: [Todos.addTodo, Todos.listTodos],\n  },\n});`} />
      <h2>Testing</h2><p>Call public actions with an injected context so providers and state remain outside unit tests.</p>
      <CodeBlock code={`const result = await Greeter.greet\n  .ctx({ ...mocks })\n  .run({ name: "Ada" });\n\nexpect(result).toBe("Hello, Ada!");`} />
    </>,
  },
];

export function Docs({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const index = Math.max(0, pages.findIndex((page) => page.slug === slug));
  const page = pages[index];

  return <main className="docs-shell">
    <button className="docs-menu-button" onClick={() => setOpen(!open)}>{open ? <X size={18} /> : <Menu size={18} />} Contents</button>
    <aside className={open ? "docs-sidebar open" : "docs-sidebar"}>
      <div className="docs-label"><BookOpen size={16} /> Documentation</div>
      <nav>{pages.map((item) => <a key={item.slug} className={item.slug === page.slug ? "active" : ""} href={`/docs/${item.slug}`}>{item.title}</a>)}</nav>
      <div className="docs-help"><span>Need a working example?</span><a href="https://github.com/ber-sen/taskwish/tree/main/packages/create-project/templates" target="_blank" rel="noreferrer">Browse the starters ↗</a></div>
    </aside>
    <article className="doc-article">
      <div className="doc-breadcrumb"><a href="/docs">Docs</a><span>/</span>{page.title}</div>
      <h1>{page.title}</h1><p className="doc-description">{page.description}</p>
      <div className="doc-content">{page.content}</div>
      <nav className="doc-pagination">
        {pages[index - 1] ? <a href={`/docs/${pages[index - 1].slug}`}><ArrowLeft size={16} /><span><small>Previous</small>{pages[index - 1].title}</span></a> : <span />}
        {pages[index + 1] ? <a href={`/docs/${pages[index + 1].slug}`}><span><small>Next</small>{pages[index + 1].title}</span><ArrowRight size={16} /></a> : <span />}
      </nav>
    </article>
    <aside className="toc"><span>On this page</span>{headingsFor(page.slug).map((heading) => <span key={heading}>{heading}</span>)}</aside>
  </main>;
}

function Callout({ children }: { children: React.ReactNode }) { return <div className="callout"><strong>Note</strong><div>{children}</div></div>; }

function headingsFor(slug: string) {
  return ({
    "getting-started": ["Requirements", "Choose a starter", "Your project"],
    actors: ["Actor", "Command actions", "Service export"],
    steps: ["Named steps", "Dependencies", "Control flow"],
    "state-and-events": ["Scoped state", "Signal an event"],
    agents: ["Configure a provider", "Agent steps", "Start from a working architecture"],
    "server-and-console": ["Server", "Console", "MCP", "Testing"],
  } as Record<string, string[]>)[slug] ?? [];
}
