import { Orchestrator } from "./orchestrator";

const orchestrator = new Orchestrator();

await orchestrator.addWorker("./worker.js");
await orchestrator.addWorker("./workerB.js");

async function run() {
  console.log("HERE");

  const b = await orchestrator.run("World");

  console.log(b);
}

run();
