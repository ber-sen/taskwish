import { newMessagePortRpcSession } from "./transport";
import { RpcTarget } from "capnweb";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Greeter extends RpcTarget {
  port = null;

  constructor(port) {
    super();

    this.port = port;
  }

  async hi(name) {
    this.port.postMessage(["lorem", 3]);

    await sleep(1000);

    return Promise.resolve(`Hello, ${name}`);
  }

  greet(name) {
    return Promise.resolve(`Hello, ${name}`);
  }

  register(orchestrator) {
    this.orchestrator = orchestrator.dub();
  }

  dub() {
    return new Greeter();
  }
}

self.onmessage = (event) => {
  const port = event.data;

  // bind RPC server
  newMessagePortRpcSession(port, new Greeter(port), "a");
};
