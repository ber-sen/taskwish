// const { parentPort } = require("worker_threads");

// import { randomBytes } from "crypto";

// const random = randomBytes(16);
// const buffer = random.buffer.slice(
//   random.byteOffset,
//   random.byteOffset + random.byteLength,
// );

// parentPort.postMessage({ buffer }, { transfer: [buffer] });

// globalThis.addEventListener("message", (message) => {
//   console.log(message);
// });

const bc = new BroadcastChannel("tasks");

bc.onmessage = (event) => {
  console.log("channel");
  console.log(event);
};

bc.postMessage("This is a test message.");
