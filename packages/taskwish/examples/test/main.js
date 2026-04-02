// main.js
const { Worker } = require("node:worker_threads");
const worker = new Worker("./worker.js");

import { randomBytes } from "crypto";

const random = randomBytes(16);
const buffer = random.buffer.slice(
  random.byteOffset,
  random.byteOffset + random.byteLength,
);

const { port1 } = new MessageChannel();
worker.postMessage({ port1 }, [port1]);
worker.postMessage({ buffer }, [buffer]);

worker.on("message", (message) => {
  console.log(message);
});
