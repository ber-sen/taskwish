import { newMessagePortRpcSession } from "./transport";
import { RpcTarget } from "capnweb";

class Orchestrator extends RpcTarget {
  actions = new Map();

  register(service, actions) {
    const servicedub = service.dub();

    actions.forEach((a) => this.actions.set(a[0], servicedub[a[1]]));
  }

  run(name, params) {
    return this.actions.get(name)?.(params);
  }

  dub() {
    return new Orchestrator();
  }
}

self.onmessage = (event) => {
  const port = event.data;

  // bind RPC server
  newMessagePortRpcSession(port, new Orchestrator(), "o");
};
