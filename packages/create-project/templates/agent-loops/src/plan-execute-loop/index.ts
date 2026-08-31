import { actor } from "./plan-execute-loop";
import { runPlanExecuteLoop } from "./run-plan-execute-loop";

export const { PlanExecuteLoop } = actor().service({ runPlanExecuteLoop });
