import { Package, Provide } from "../src";

export default Package(
  "Example",

  import("./actions"),
  import("./agents"),
  import("./packages/slack"),

  ["POST:/api/simple", import("./usecases/simple")],
  ["GET:/api/say-hello/:language", import("./usecases/say-hello")],
  ["CMD:say-hello :language", import("./usecases/say-hello")],
  ["GMAIL:pajaziti.bersen@gmail.com", import("./usecases/io")],
  ["SLACK:pajaziti.bersen@gmail.com", import("./usecases/io")],

  Provide("env", process.env)
);
