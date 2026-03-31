import { serve } from "bun";

const worker = new Worker("./worker.ts");

function runWorkerTask(taskData: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const handleMessage = (e: MessageEvent) => {
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      resolve(e.data);
    };

    const handleError = (e: ErrorEvent) => {
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      reject(e.error || e);
    };

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);

    worker.postMessage(taskData);
  });
}

const workerPort = await runWorkerTask("hello")

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
