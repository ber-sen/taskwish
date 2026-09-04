import { actor } from "./actor";
import { addTodo } from "./add-todo";
import { completeTodo } from "./complete-todo";
import { listTodos } from "./list-todos";

export const { Todos } = actor().service({
  addTodo,
  completeTodo,
  listTodos,
});
