import { RpcTarget, newMessagePortRpcSession } from "capnweb";

class Greeter extends RpcTarget {
  greet(name) {
    return Promise.resolve(`Hello, ${name}`);
  }
}

self.onmessage = (event) => {
  const port = event.data;

  // bind RPC server
  newMessagePortRpcSession(port, new Greeter());
};
