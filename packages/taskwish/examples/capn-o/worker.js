import { newMessagePortRpcSession } from "./transport";
import { RpcTarget } from "capnweb";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Greeter extends RpcTarget {
  async hi(name) {
    await sleep(1000);

    return Promise.resolve(`Hello, ${name}`);
  }

  async greet(name, next) {
    return `${name} ${await next("lorem", name)}`;
  }

  register() {
    return [
      ["greet", this.greet],
      ["hi", this.hi],
    ];
  }
}

self.onmessage = (event) => {
  const port = event.data;

  // bind RPC server
  newMessagePortRpcSession(port, new Greeter(), "a");
};
