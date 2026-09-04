import type { ConsoleConfig } from "@taskwish/console/react";

const input = (name: string, description: string, example: string) => ({
  name,
  description,
  example,
  required: true,
  schema: { type: "string" },
});

export const consoleDemoConfig: ConsoleConfig = {
  nodeName: "Acme Operations",
  apiKey: "taskwish-demo",
  apiPrefix: "/api/console-demo",
  actions: [
    {
      id: "Todos::addTodo",
      actor: "Todos",
      action: "addTodo",
      label: "Add todo",
      description: "Add an item to the todo list.",
      route: "/api/console-demo/run?action=addTodo",
      source: "local",
      input: [
        input("description", "Work that needs to be done.", "Build with TaskWish"),
      ],
    },
    {
      id: "Todos::listTodos",
      actor: "Todos",
      action: "listTodos",
      label: "List todos",
      description: "List todo items, optionally filtered by completion status.",
      route: "/api/console-demo/run?action=listTodos",
      source: "local",
      input: [
        {
          name: "done",
          description: "Completion status to include.",
          example: false,
          schema: { type: "boolean" },
        },
      ],
    },
    {
      id: "Todos::completeTodo",
      actor: "Todos",
      action: "completeTodo",
      label: "Complete todo",
      description: "Mark a todo item as complete.",
      route: "/api/console-demo/run?action=completeTodo",
      source: "local",
      input: [
        {
          ...input(
            "id",
            "Todo identifier.",
            "550e8400-e29b-41d4-a716-446655440000",
          ),
          metadata: {
            suggestions: {
              $: "Todos::listTodos",
              "*":
                'result.filter(item, !item.done).map(item, {"value": item.id, "label": item.description})',
            },
          },
        },
      ],
      meta: {
        stateCommands: {
          item: {
            completeTodo: {
              input: { id: "item.id" },
              visible: { done: false },
            },
          },
        },
      },
    },
  ],
  mcp: {
    enabled: true,
    endpoints: [
      {
        path: "/actor",
        tools: [
          {
            name: "Todos.addTodo",
            action: "Todos::addTodo",
            description: "Add an item to the todo list.",
          },
          {
            name: "Todos.listTodos",
            action: "Todos::listTodos",
            description: "List todo items.",
          },
          {
            name: "Todos.completeTodo",
            action: "Todos::completeTodo",
            description: "Mark a todo item as complete.",
          },
        ],
      },
    ],
  },
};
