import Server from "sica-server";

import { Package, Provide } from "../src";

export default Package(
  "Example",
  Server({ listen: 3000 }),

  import("./actions"),
  import("./agents"),
  import("./packages/slack"),

  ["POST", "/api/simple", import("./usecases/simple")],
  ["GET", "/api/say-hello/:language", import("./usecases/say-hello")],
  ["CMD", "say-hello :language", import("./usecases/say-hello")],

  Provide("env", process.env),
);
