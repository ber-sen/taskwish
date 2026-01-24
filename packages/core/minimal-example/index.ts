import { Package } from "../src";

export default Package(
  "My automation",

  import("./slack-reply"),

  Provide("env", process.env)
);
