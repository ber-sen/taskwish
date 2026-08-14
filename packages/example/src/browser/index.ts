import { browser } from "./browser";
import { browse } from "./browse";
import { close } from "./close";

export const { Browser } = browser().service({ browse, close });
