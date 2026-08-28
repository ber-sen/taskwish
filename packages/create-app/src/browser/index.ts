import { actor } from "./browser";
import { browse } from "./browse";
import { close } from "./close";

export const { Browser } = actor().service({ browse, close });
