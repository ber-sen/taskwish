import { serve } from "bun";
import { wrap } from "comlink";

const MyWorker = wrap<typeof import("./worker")>(new Worker("./worker.ts"));

const workerPort = await MyWorker.init();

console.log(workerPort)

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
