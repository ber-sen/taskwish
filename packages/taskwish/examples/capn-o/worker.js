import { newMessagePortRpcSession } from "./transport";
import { RpcTarget } from "capnweb";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Greeter extends RpcTarget {
  orchestrator = null;

  async hi(name) {
    await sleep(1000);

    return Promise.resolve(`Hello, ${name}`);
  }

  async greet(name) {
    // await this.orchestrator.signal();

    return `${name}`;
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
  newMessagePortRpcSession(port, new Greeter(), "a");
};
