import { actor } from "./actor";
import { openCase } from "./open-case";

export const { Support } = actor().service({ openCase });
