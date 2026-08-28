import { Actor, State } from "taskwish";

const { actor } = Actor("Todos").scope(
  State({
    items: State.List({
      id: "primary.uuidv4.random",
      description: "string",
      done: "boolean",
    }),
  }),
);

export const { addTodo } = actor()
  .on("Command", "addTodo")

  .input({ description: "string" })

  .run(function () {
    const todo = {
      description: this.input.description,
      done: false,
    };

    this.state.items.push(todo);
    return this.state.items.at(-1)!;
  });

export const { listTodos } = actor()
  .on("Command", "listTodos")

  .input({ "done?": "boolean" })

  .run(function () {
    if (this.input.done === undefined) return this.state.items;
    return this.state.items.filter(({ done }) => done === this.input.done);
  });

export const { markTodoDone } = actor()
  .use(listTodos)

  .on("Command", "markTodoDone")

  .input({ id: "string.uuid.v4" })

  .addStateCommand("item", {
    markDone: {
      input: { id: "item.id" },
      visible: { done: false },
    },
  })

  .run(function () {
    const todo = this.state.items.find(({ id }) => id === this.input.id);
    if (!todo) throw new Error(`Todo ${this.input.id} does not exist`);

    todo.done = true;
    return todo;
  })

  .meta({
    input: {
      id: {
        suggestions: {
          $: "todos.listTodos",
          "*": (result) =>
            result
              .filter((item) => !item.done)
              .map((item) => ({ value: item.id, label: item.description })),
        },
      },
    },
  });

export const { Todos } = actor().service({ addTodo, markTodoDone, listTodos });
