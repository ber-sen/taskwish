import { actor } from "./goal-driven-loop";
import { runGoalDrivenLoop } from "./run-goal-driven-loop";

export const { GoalDrivenLoop } = actor().service({ runGoalDrivenLoop });
