// main.js
const { Worker } = require("node:worker_threads")
const worker = new Worker("./worker.js")

const { port1 } = new MessageChannel();
worker.postMessage({ port1 }, [port1]);

worker.on("message", (message) => {
    console.log(message)
})

