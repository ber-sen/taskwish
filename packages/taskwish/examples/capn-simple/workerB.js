import { newMessagePortRpcSession } from "./transport";
import { RpcTarget } from "capnweb";

class Greeter extends RpcTarget {
  a = null;

  setA(a) {
    this.a = a.dub();
  }
  hi(name) {
    return this.a.greet(name);
  }

  [Symbol.dispose]() {}
}

self.onmessage = (event) => {
  const port = event.data;

  // bind RPC server
  newMessagePortRpcSession(port, new Greeter(), "b");
};
