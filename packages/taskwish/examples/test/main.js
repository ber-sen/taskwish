// main.js
const { Worker } = require("node:worker_threads");
const worker = new Worker("./worker.js");

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

  // send port2 to worker
  worker.postMessage({ port: channel.port2 }, [channel.port2]);

  // listen on port1
  channel.port1.onmessage = (e) => {
    console.log("from worker:", e.data);
  };

  // optional but recommended in some environments
  channel.port1.start();
};
