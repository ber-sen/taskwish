import { actor } from "./self-ask-loop";
import { runSelfAskLoop } from "./run-self-ask-loop";

export const { SelfAskLoop } = actor().service({ runSelfAskLoop });
