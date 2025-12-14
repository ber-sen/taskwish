import { Package } from "../src";

export default Package(
  "Example",

  import("./actions"),
  import("./packages/slack"),
  import("./actors/simple"),
  import("./actors/say-hello"),
  import("./actors/io")
);
