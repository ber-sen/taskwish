import { actor } from "./environment-loop";
import { runEnvironmentLoop } from "./run-environment-loop";

export const { EnvironmentLoop } = actor().service({ runEnvironmentLoop });
