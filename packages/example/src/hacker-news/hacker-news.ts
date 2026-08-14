import { Actor } from "taskwish";

import { Browser } from "../browser";

export const { hackerNews } = Actor("HackerNews").use(Browser);
