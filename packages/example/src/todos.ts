import { $, Actor, State } from "taskwish";

const { actor } = Actor("Todos").scope(
  State({
    items: State.List({
      id: "primary.uuidv4.random",
      description: "string",
      done: "boolean",
    }),
  })
);

export const { add } = actor()
  .on("Command", "add")

  .input({ description: "string" })

  .run(function () {
    const todo = {
      description: this.input.description,
      done: false,
    };

    this.state.items.push(todo);
    return this.state.items.at(-1)!;
  });

export const { list } = actor()
  .on("Command", "list")

  .input({ "done?": "boolean" })

  .run(function () {
    if (this.input.done === undefined) return this.state.items;
    return this.state.items.filter(({ done }) => done === this.input.done);
  });

export const { complete } = actor()
  .use(list)

  .on("Command", "complete")

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
          $: "todos.list",
          "*": $("").map(["todo"], ["todo.description", "todo.id"]),
          done: false,
        },
      },
    },
  });

export const { Todos } = actor().service({ add, complete, list });
