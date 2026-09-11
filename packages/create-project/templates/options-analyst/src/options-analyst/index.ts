import { analyzeCall } from "./analyze-call";
import { actor } from "./options-analyst";

export const { OptionsAnalyst } = actor().service({ analyzeCall });
