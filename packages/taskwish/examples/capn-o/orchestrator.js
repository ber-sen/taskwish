import { RpcTarget } from "capnweb";
import { newMessagePortRpcSession } from "./transport";

export class Orchestrator extends RpcTarget {
  actions = {};
  workers = [];
  count = 1;

  async addWorker(path) {
    console.log("ADD WORKER", path);

    const worker = new Worker(path);

    const ch1 = new MessageChannel();

    worker.postMessage(ch1.port1, [ch1.port1]);

    const workerApi = newMessagePortRpcSession(
      ch1.port2,
      undefined,
      `o-${this.count++}`,
    );

    const capabilities = await workerApi.connect(this);

    this.workers.push(workerApi);

    for (const [name, method] of capabilities) {
      this.actions[name] = method;
    }

    return capabilities.map(([key]) => key);
  }

  signal() {
    console.log(this.actions);

    return true;
  }

  dub() {
    const orchestrator = new Orchestrator();
    orchestrator.actions = this.actions;
    orchestrator.workers = this.workers;
    orchestrator.count = this.count;

    return orchestrator;
  }

  async run(name) {
    console.log("HERE");

    return this.workers[0].run(name);
  }
}
