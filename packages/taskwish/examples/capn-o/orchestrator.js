import { newMessagePortRpcSession } from "./transport";
import { RpcTarget } from "capnweb";

const worker = new Worker("./worker.js");

const ch1 = new MessageChannel();

worker.postMessage(ch1.port1, [ch1.port1]);

const workerApi = newMessagePortRpcSession(ch1.port2);

class Orchestrator extends RpcTarget {
  actions = new Map();

  async hi(name) {
    return workerApi.greet(name)
  }

  greet(name) {
    return Promise.resolve(`Hello, ${name}`);
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
