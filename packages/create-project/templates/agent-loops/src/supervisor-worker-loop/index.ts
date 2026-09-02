import { actor } from "./supervisor-worker-loop";
import { runSupervisorWorkerLoop } from "./run-supervisor-worker-loop";

export const { SupervisorWorkerLoop } = actor().service({
  runSupervisorWorkerLoop,
});
