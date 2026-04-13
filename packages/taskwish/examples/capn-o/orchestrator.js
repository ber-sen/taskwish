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

    const capabilities = await workerApi.connect({
      signal: () => console.log(this.actions),
      dub: () => ({
        signal: () => console.log(this.actions),
      }),
    });

    this.workers.push(workerApi);

    for (const [name, method] of capabilities) {
      this.actions[name] = method;
    }

    return capabilities.map(([key]) => key);
  }

  async run(name) {
    return this.actions.greet(
      name,
      async (key, params) => await this.actions[key](params),
    );
  }
}
