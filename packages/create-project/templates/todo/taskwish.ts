import { Console } from "@taskwish/console";
import { Server } from "@taskwish/server";

import { Motivator } from "./src/motivator";
import { Todos } from "./src/todos";

await Server("TaskWish Todo", {
  apps: [Console()],
  workspace: [Motivator, Todos],
});
