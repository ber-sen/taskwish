import { Console } from "@taskwish/console";
import { Node } from "taskwish";
import { Accounting } from "./accounting-model";
import { Browser } from "./browser";
import { HackerNews } from "./hacker-news";
import { PipeSolver } from "./pipe-solver";
import { Piper } from "./piper";
import { PuzzleSolver } from "./puzzle-solver";
import { Solver } from "./solver";
import { Streamer } from "./streamer";
import { Greeter } from "./greeter";
import { Biller } from "./biller";

await Node("example", {
  apiKey: process.env.TW_API_KEY,
  port: 3000,
  apps: [Console()],
  workspace: [
    Greeter,
    Biller,
    Browser,
    HackerNews,
    Streamer,
    Piper,
    Solver,
    PipeSolver,
    PuzzleSolver,
    Accounting,
  ],
});
