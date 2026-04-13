import { newMessagePortRpcSession } from "./transport";
import { RpcTarget } from "capnweb";

class Greeter extends RpcTarget {
  orchestrator = null;

  lorem(name) {
    return Promise.resolve(`Hi, ${name}`);
  }

  connect(orchestrator) {
    this.orchestrator = orchestrator.dub();

    return this.capabilities();
  }

  capabilities() {
    return Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter(
        (item) => !["constructor", "connect", "capabilities"].includes(item),
      )
      .map((capability) => [capability, this[capability].bind(this)]);
  }
}

self.onmessage = (event) => {
  const port = event.data;

  // bind RPC server
  newMessagePortRpcSession(port, new Greeter(), "b");
};
