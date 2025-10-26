import { App } from "../src";

export const app = App("AppName")

export type AppType = typeof app

onmessage = app.worker().onmessage
