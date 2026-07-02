import { Node } from "taskwish";

import { startupMessage } from "./helpers";

const node = await Node("example", {
  workspace: [
    import("./greeter"),
    import("./biller"),
    import("./browser"),
    import("./hackerNews"),
  ],
  apiKey: process.env.TW_API_KEY,
  port: Number(process.env.PORT ?? 3000),
});

console.log(startupMessage(node.url.origin, node.apiKey));
