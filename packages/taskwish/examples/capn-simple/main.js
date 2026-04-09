import { newMessagePortRpcSession } from "./transport";

const worker = new Worker("./worker.js");

const { port1, port2 } = new MessageChannel();

worker.postMessage(port1, [port1]);

const api = newMessagePortRpcSession(port2);

async function run() {
  const a = await api.greet(api.greet("Bersen"));
  console.log(a)
}

run()