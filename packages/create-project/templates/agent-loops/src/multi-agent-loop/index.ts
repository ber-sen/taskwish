import { actor } from "./multi-agent-loop";
import { runMultiAgentLoop } from "./run-multi-agent-loop";

export const { MultiAgentLoop } = actor().service({ runMultiAgentLoop });
