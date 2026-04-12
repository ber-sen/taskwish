import { newMessagePortRpcSession } from "./transport";
import { RpcTarget } from "capnweb";

class Greeter extends RpcTarget {
  greet(name) {
    return Promise.resolve(`Hello, ${name}`);
  }

  init(orchestrator) {
    orchestrator.register(this, [["$greet", "greet"]]);
  }

  dub() {
    return new Greeter();
  }
}

self.onmessage = (event) => {
  const port = event.data;

  // bind RPC server
  newMessagePortRpcSession(port, new Greeter(), "a");
};
