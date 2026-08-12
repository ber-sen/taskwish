import { hackerNews } from "./hacker-news";
import { openFirstPage } from "./open-first-page";

export const { HackerNews } = hackerNews().service({ openFirstPage });
