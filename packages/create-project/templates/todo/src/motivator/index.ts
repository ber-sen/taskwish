import { actor } from "./actor";
import { createMotivationalTodo } from "./create-motivational-todo";
import { onTodosTodoCompleted } from "./on-todo-completed";

export const { Motivator } = actor().service({
  createMotivationalTodo,
  onTodosTodoCompleted,
});
