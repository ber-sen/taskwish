import { actor } from "./hacker-news";
import { openFirstPage } from "./open-first-page";

export const { HackerNews } = actor().service({ openFirstPage });
