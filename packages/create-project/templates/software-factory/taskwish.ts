import { Console } from "@taskwish/console";
import { Server } from "@taskwish/server";

import { CodingAgent } from "./src/coding-agent";
import { GitHub } from "./src/github";
import { ReviewAgent } from "./src/review-agent";

await Server("TaskWish Software Factory", {
  port: Number(process.env.PORT ?? 0),
  apps: [Console()],
  workspace: [GitHub, CodingAgent, ReviewAgent],
});
