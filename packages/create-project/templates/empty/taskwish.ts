import { Console } from "@taskwish/console";
import { Server } from "@taskwish/server";

import { Greeter } from "./src/greeter";

await Server("TaskWish Greeter", {
  apps: [Console()],
  workspace: [Greeter],
});
