import { sleep } from "bun";
import { WorkerChildIO } from "../../src/adapters/worker.ts";
import { RPCChannel } from "../../src/channel.ts";
import type { IoInterface } from "../../src/interface.ts";
import { apiMethods, type API } from "./api.ts";

console.log("Worker: Script start");

queueMicrotask(() => {
  console.log("Worker: Microtask running (All sync tasks finished!)");
  self.postMessage("done");
});

const io: IoInterface = new WorkerChildIO();
const rpc = new RPCChannel<API, API, IoInterface>(io, { expose: apiMethods });
const api = rpc.getAPI();

function syncTask(name: string, duration: number) {
  const start = Date.now();
  while (Date.now() - start < duration) {
    /* block thread */
  }
  console.log(`Worker: Finished ${name}`);
}

syncTask("Task A", 100);
syncTask("Task B", 100);

console.log("Worker: Script end");

// const randInt1 = Math.floor(Math.random() * 100)
// const randInt2 = Math.floor(Math.random() * 100)
// api.add(randInt1, randInt2)
