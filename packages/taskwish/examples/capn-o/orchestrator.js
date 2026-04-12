import { newMessagePortRpcSession } from "./transport";

export class Orchestrator {
  actions = {};
  workers = [];
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

    this.workers.push(workerApi);

    for (const [name, method] of register) {
      this.actions[name] = method;
    }

    return register.map(([key]) => key);
  }

  run(name) {
    return this.actions.greet(name);
  }
}
