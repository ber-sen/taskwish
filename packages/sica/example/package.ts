import { Package } from "../src";

export default Package(
  "Example",

  import("./actions"),
  import("./packages/slack"),
  import("./actors/simple"),
  import("./actors/say-hello"),
  import("./actors/io"),

  ["GET:/api/say-hello/:language", import("./package").helloWold],
  ["CMD:say-hello :language", import("./package").helloWold],
  ["GMAIL:pajaziti.bersen@gmail.com", import("./package").io],
  ["SLACK:U05KMUK39UJ #general", import("./package").io],

  Provide("env", process.env)
);
