import { Package, Provide } from "../src";

export default Package(
  "Example",

  import("./actions"),
  import("./packages/slack"),
  import("./usecases/simple"),
  import("./usecases/say-hello"),
  import("./usecases/io")
);
