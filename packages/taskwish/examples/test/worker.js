// const { parentPort } = require("worker_threads");
// const { port1 } = new MessageChannel();
// parentPort.postMessage({ port1 }, port1);

globalThis.addEventListener("message", (message) => {
  console.log(message);
});
