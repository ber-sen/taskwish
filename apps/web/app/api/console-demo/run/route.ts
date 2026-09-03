import {
  addDemoTodo,
  completeDemoTodo,
  demoSession,
  demoSessionCookie,
} from "../../../../src/console-demo-store";

type DemoEvent = {
  event:
    | "TW::StateChange"
    | "TW::StateResult"
    | "TW::Signal"
    | "TW::Result"
    | "TW::Error";
  data: unknown;
};

function stream(events: DemoEvent[], sessionId: string, status = 200) {
  const body = events
    .map(({ event, data }) => `event: ${event}\ndata: ${JSON.stringify(data)}`)
    .join("\n\n");
  return new Response(`${body}\n\n`, {
    status,
    headers: {
      "Cache-Control": "no-cache",
      "Content-Type": "text/event-stream",
      "Set-Cookie": demoSessionCookie(sessionId),
    },
  });
}

export async function POST(request: Request) {
  const input = (await request.json()) as Record<string, unknown>;
  const action = new URL(request.url).searchParams.get("action");
  const session = demoSession(request);

  if (action === "addTodo") {
    const description = String(input.description ?? "Untitled todo");
    const previous = structuredClone(session.todos);
    const todo = addDemoTodo(session.todos, description);
    return stream(
      [
        {
          event: "TW::StateChange",
          data: { path: "state.items", previous, value: session.todos },
        },
        { event: "TW::Result", data: todo },
      ],
      session.id,
    );
  }

  if (action === "listTodos") {
    const done = input.done;
    const todos =
      typeof done === "boolean"
        ? session.todos.filter((todo) => todo.done === done)
        : session.todos;
    return stream(
      [
        {
          event: "TW::StateResult",
          data: { path: "state.items", value: todos },
        },
      ],
      session.id,
    );
  }

  if (action === "completeTodo") {
    const id = String(input.id ?? "");
    const previous = structuredClone(session.todos);
    const todo = completeDemoTodo(session.todos, id);
    if (!todo) {
      return stream(
        [{ event: "TW::Error", data: `Todo ${id} does not exist.` }],
        session.id,
        404,
      );
    }
    return stream(
      [
        {
          event: "TW::StateChange",
          data: { path: "state.items", previous, value: session.todos },
        },
        {
          event: "TW::Signal",
          data: {
            event: "Todos::TodoCompleted",
            id: todo.id,
            description: todo.description,
          },
        },
        { event: "TW::Result", data: todo },
      ],
      session.id,
    );
  }

  return Response.json({ error: "Unknown demo action." }, { status: 404 });
}
