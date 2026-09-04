import { Console } from "@taskwish/console";
import { Server } from "@taskwish/server";

import { CodingAgent } from "./src/coding-agent";
import { GitHub } from "./src/github";
import { ReviewAgent } from "./src/review-agent";
import { Slack } from "./src/slack";

await Server("TaskWish Software Factory", {
  port: Number(process.env.PORT ?? 0),
  apps: [Console()],
  workspace: [GitHub, Slack, CodingAgent, ReviewAgent],
});
