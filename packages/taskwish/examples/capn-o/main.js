import { Orchestrator } from "./orchestrator";

const orchestrator = new Orchestrator();

await orchestrator.addWorker("./worker.js");
await orchestrator.addWorker("./workerB.js");

async function run() {
  const b = await orchestrator.handoff("World");

  console.log(b);
}

run();
