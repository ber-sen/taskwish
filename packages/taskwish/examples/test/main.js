// main.js
const { Worker } = require("node:worker_threads");
const worker = new Worker("./worker.js");
const workerC = new Worker("./workerC.js");

// import { randomBytes } from "crypto";

// const random = randomBytes(16);
// const buffer = random.buffer.slice(
//   random.byteOffset,
//   random.byteOffset + random.byteLength,
// );

// worker.on("message", (message) => {
//   console.log(message);
// });

const bc = new BroadcastChannel("tasks");

bc.onmessage = (event) => {
  console.log("channel parent");
  console.log(event);

  const channel = new MessageChannel();
  const buffer = new SharedArrayBuffer(1024);

  // send port2 to worker
  worker.postMessage({ buffer, port: channel.port2 }, [channel.port2]);
  workerC.postMessage({ buffer });

  // listen on port1
  channel.port1.onmessage = (e) => {
    console.log("from worker:", e.data);
    workerC.postMessage(e.data);
  };

  // optional but recommended in some environments
  channel.port1.start();
};
