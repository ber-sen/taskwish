import { newMessagePortRpcSession } from "./transport";

const orchestrator = new Worker("./orchestrator.js");

const ch1 = new MessageChannel();

orchestrator.postMessage(ch1.port1, [ch1.port1]);

const orchestratorApi = newMessagePortRpcSession(ch1.port2);

async function run() {
  console.log("HERE");

  const b = await orchestratorApi.greet(orchestratorApi.hi("World"));
  console.log(b);
}

run();
