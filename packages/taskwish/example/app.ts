import { App } from "../src";
import sayHello from "./usecases/say-hello";
import simple from "./usecases/simple";

export const app = App("AppName").config(
  Actions(import("./actions")),
  ["POST", "/api/simple", simple],
  ["GET", "/api/say-hello/:language", sayHello],
  ["CMD", "say-hello :language", sayHello],
);

export type AppType = typeof app;

onmessage = app.worker().onmessage;
