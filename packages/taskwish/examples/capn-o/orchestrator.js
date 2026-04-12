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

  async run(name) {
    const res = await this.actions.greet(name);

    if (Array.isArray(res) && res.length === 3 && res[0] === "$") {
      return this.actions[res[1]](res[2]);
    }

    return res;
  }
}
