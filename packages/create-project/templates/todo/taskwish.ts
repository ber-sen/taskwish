import { ActivityLog } from "./src/activity-log";
import { Todos } from "./src/todos";

const todo = await Todos.addTodo({ description: "Build with TaskWish" });
await ActivityLog.record({ message: `Added todo: ${todo.description}` });

console.log(await Todos.listTodos({}));
console.log(await ActivityLog.listEntries());
