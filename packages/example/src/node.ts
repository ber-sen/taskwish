import { Node } from "taskwish";

import { startupMessage } from "./helpers";

const node = await Node("example", {
  apiKey: process.env.TW_API_KEY,
  port: 3000,
  workspace: [
    import("./greeter"),
    import("./biller"),
    import("./browser"),
    import("./hackerNews"),
    import("./streamer"),
  ],
});

console.log(startupMessage(node.url.origin, node.apiKey));
