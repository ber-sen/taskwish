import { App, Provide } from "../src";

export default App(
  "AppName",
  Provide("env", process.env),

  import("./actions"),
  import("./agents"),
  import("./packages/slack"),

  ["POST", "/api/simple", import("./usecases/simple")],
  ["GET", "/api/say-hello/:language", import("./usecases/say-hello")],
  ["CMD", "say-hello :language", import("./usecases/say-hello")]
);
