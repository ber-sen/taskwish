import { newMessagePortRpcSession } from "./transport";
import { RpcTarget } from "capnweb";

class Greeter extends RpcTarget {
  lorem(name) {
    return Promise.resolve(`Hi, ${name}`);
  }

  register() {
    return [["lorem", this.lorem]];
  }
}

self.onmessage = (event) => {
  const port = event.data;

  // bind RPC server
  newMessagePortRpcSession(port, new Greeter(), "b");
};
