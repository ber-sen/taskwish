import { newMessagePortRpcSession, MessagePortTransport } from "./transport";
import { RpcTarget, RpcSession } from "capnweb";

const worker = new Worker("./worker.js");

const ch1 = new MessageChannel();

worker.postMessage(ch1.port1, [ch1.port1]);

const workerApi = newMessagePortRpcSession(ch1.port2);

class Orchestrator extends RpcTarget {
  actions = new Map();

  hi(name) {
    return workerApi.hi(name);
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

  const transport = new MessagePortTransport(port, "o");
  const rpc = new RpcSession(transport, new Orchestrator());

  rpc.getRemoteMain();
};
