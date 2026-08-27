import { Console } from "@taskwish/console";
import { Server } from "@taskwish/server";
import { Accounting } from "./accounting-model";
import { Browser } from "./browser";
import { HackerNews } from "./hacker-news";
import { PipeSolver } from "./pipe-solver";
import { PuzzleSolver } from "./puzzle-solver";
import { Solver } from "./solver";
import { Greeter } from "./greeter";
import { Biller } from "./biller";
import { CodexAgent } from "./codex-agent";
import { FxAgent } from "./fx-agent";
import { Todos } from "./todos";
import { Counter } from "./counter";

await Server("example", {
  apiKey: process.env.TW_API_KEY,
  port: 3000,
  apps: [Console()],
  workspace: [
    Greeter,
    Biller,
    Browser,
    HackerNews,
    Counter,
    Solver,
    PipeSolver,
    PuzzleSolver,
    Accounting,
    Todos,
    CodexAgent,
    FxAgent,
  ],
});
