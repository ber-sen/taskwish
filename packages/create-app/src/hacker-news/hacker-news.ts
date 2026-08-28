import { Actor } from "taskwish";

import { Browser } from "../browser";

export const { actor } = Actor("HackerNews").use(Browser);
