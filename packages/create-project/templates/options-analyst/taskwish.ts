import { Console } from "@taskwish/console";
import { Server } from "@taskwish/server";

import { OptionsAnalyst } from "./src/options-analyst";

await Server("TaskWish Options Analyst", {
  port: Number(process.env.PORT ?? 0),
  apps: [Console()],
  workspace: [OptionsAnalyst],
});
