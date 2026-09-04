import { actor } from "./basic-agent-loop";
import { runBasicAgentLoop } from "./run-basic-agent-loop";

export const { BasicAgentLoop } = actor().service({ runBasicAgentLoop });
