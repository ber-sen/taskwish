import { newMessagePortRpcSession } from "./transport";
import { RpcTarget } from "capnweb";

class Greeter extends RpcTarget {
  hi(name) {
    return Promise.resolve(`Hi, ${name}`);
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
