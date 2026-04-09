import { newMessagePortRpcSession } from "capnweb";

const worker = new Worker("./worker.js");

const { port1, port2 } = new MessageChannel();

worker.postMessage(port1, [port1]);

const api = newMessagePortRpcSession(port2);

async function run() {
  const stream = await api.streamText("taskwish");

  const reader = stream.getReader();

  while (true) {
    const { value, done } = await reader.read();

    if (done) break;

    console.log("value:", value);
  }
}

run();