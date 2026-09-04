export type DemoTodo = {
  id: string;
  description: string;
  done: boolean;
};

const initialTodos: DemoTodo[] = [
  {
    id: "550e8400-e29b-41d4-a716-446655440000",
    description: "Try the TaskWish Console",
    done: false,
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    description: "Ship an autonomous workflow",
    done: true,
  },
];

const sessions = new Map<string, DemoTodo[]>();

export function demoSession(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const existingId = cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("taskwish-demo-session="))
    ?.split("=")[1];
  const id = existingId || crypto.randomUUID();
  let todos = sessions.get(id);
  if (!todos) {
    todos = structuredClone(initialTodos);
    sessions.set(id, todos);
  }
  return { id, todos };
}

export function demoSessionCookie(id: string) {
  return `taskwish-demo-session=${id}; Path=/; HttpOnly; SameSite=Lax`;
}

export function addDemoTodo(todos: DemoTodo[], description: string): DemoTodo {
  const todo = {
    id: crypto.randomUUID(),
    description,
    done: false,
  };
  todos.push(todo);
  return todo;
}

export function completeDemoTodo(
  todos: DemoTodo[],
  id: string,
): DemoTodo | undefined {
  const todo = todos.find((item) => item.id === id);
  if (todo) todo.done = true;
  return todo;
}
