import { Actor } from "../../src";
// import tsEvent from "../events/ts-event";

export default Actor("Chat bot")
  .use(import("../package"))

  .coordinates(SomeOtherActor);
