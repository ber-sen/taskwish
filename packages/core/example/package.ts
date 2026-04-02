import { Package } from "../src";

export default Package("Example", [
  import("./actions"),
  import("./packages/slack"),
  import("./actors/simple"),

  ["GET", "/api/say-hello/:language", import("./actors/say-hello")],
  ["CMD", "say-hello :language", import("./actors/say-hello")],
  ["GMAIL", "pajaziti.bersen@gmail.com", import("./actors/threads")],
  ["SLACK", "U05KMUK39UJ #general", import("./actors/threads")],

  Provide("env", process.env),
]);
