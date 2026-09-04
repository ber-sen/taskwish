import { actor } from "./evaluator-optimizer-loop";
import { runEvaluatorOptimizerLoop } from "./run-evaluator-optimizer-loop";

export const { EvaluatorOptimizerLoop } = actor().service({
  runEvaluatorOptimizerLoop,
});
