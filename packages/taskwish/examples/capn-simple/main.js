import { newMessagePortRpcSession } from "./transport";

const worker = new Worker("./worker.js");

const ch1 = new MessageChannel();

worker.postMessage(ch1.port1, [ch1.port1]);

const serA = newMessagePortRpcSession(ch1.port2);

const ch2 = new MessageChannel();

const workerB = new Worker("./workerB.js");

workerB.postMessage(ch2.port1, [ch2.port1]);

const serB = newMessagePortRpcSession(ch2.port2);

await serB.setA(serA);

async function run() {
  console.log("HERE");

  const b = await serB.hi("World");
  console.log(b);

  console.log("HERE 2");

  const c = await serB.hi("Bersen");
  console.log(c);
}

run();
