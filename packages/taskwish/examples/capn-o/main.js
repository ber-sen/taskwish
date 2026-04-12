import { newMessagePortRpcSession } from "./transport";

const orchestrator = new Worker("./orchestrator.js");

const ch1 = new MessageChannel();

orchestrator.postMessage(ch1.port1, [ch1.port1]);

const orchestratorApi = newMessagePortRpcSession(ch1.port2);

const ch2 = new MessageChannel();

const worker = new Worker("./worker.js");

worker.postMessage(ch2.port1, [ch2.port1]);

const workerApi = newMessagePortRpcSession(ch2.port2);

const ch3 = new MessageChannel();

const workerB = new Worker("./workerB.js");

workerB.postMessage(ch3.port1, [ch3.port1]);

const workerBApi = newMessagePortRpcSession(ch3.port2);

async function run() {
  await workerApi.init(orchestratorApi);
  await workerBApi.init(orchestratorApi);
  
  console.log("HERE");

  const b = await orchestratorApi.run("$greet", "World");
  console.log(b);

  console.log("HERE");

  const c = await orchestratorApi.run("$hi", "World");
  console.log(c);
}

run();
