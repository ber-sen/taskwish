import { CommandCenter } from "@taskwish/cmd";
import { Node } from "taskwish";

await Node("example", {
  apiKey: process.env.TW_API_KEY,
  port: 3000,
  apps: [CommandCenter()],
  workspace: [
    import("./greeter"),
    import("./biller"),
    import("./browser"),
    import("./hackerNews"),
    import("./streamer"),
    import("./piper"),
    import("./solver"),
    import("./pipe-solver"),
    import("./puzzle-solver"),
    import("./accounting-model"),
  ],
});
