import { serve } from "bun";
import { wrap, transferHandlers } from "./comlink";
import { asyncGeneratorTransferHandler } from "./transfer";

transferHandlers.set("async", asyncGeneratorTransferHandler);

const MyWorker = wrap<typeof import("./worker")>(new Worker("./worker.ts"));

const workerPort = await MyWorker.init().then((a) => a.next());

// const workerPort = await MyWorker.test();

console.log(workerPort);

const server = serve({
  routes: {
    "/api/version": () => fetch(`localhost:${workerPort}/api/version`),
  },
});

// // Deploy new routes without downtime
// server.reload({
//   routes: {
//     "/api/version": async () => await runWorkerTask("hello"),
//   },
// });

console.log(server.port);
