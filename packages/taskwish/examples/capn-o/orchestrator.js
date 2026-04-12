import { newMessagePortRpcSession } from "./transport";
import { RpcTarget } from "capnweb";

class Orchestrator extends RpcTarget {
  actions = new Map();
  count = 1;

  async addWorker(path) {
    const worker = new Worker(path);

    const ch1 = new MessageChannel();

    worker.postMessage(ch1.port1, [ch1.port1]);

    const workerApi = newMessagePortRpcSession(
      ch1.port2,
      undefined,
      `o-${this.count++}`,
    );

    const register = await workerApi.register();

    for (const [name, method] of register) {
      this.actions.set(name, method);
    }

    return register.map(([key]) => key);
  }

  run(name) {
    return this.actions.get("greet")(this.actions.get("lorem")(name));
  }

  dub() {
    return new Orchestrator();
  }
}

self.onmessage = (event) => {
  const port = event.data;

  newMessagePortRpcSession(port, new Orchestrator(), "o");
};
