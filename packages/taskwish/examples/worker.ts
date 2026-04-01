import { serve } from "bun";
import { expose, transferHandlers } from "./comlink";
import { asyncGeneratorTransferHandler } from "./transfer";

transferHandlers.set("async", asyncGeneratorTransferHandler);

const server = serve({
  port: 3001,
  routes: {
    "/api/version": () => Response.json({ version: "2.0.0" }),
  },
});

export async function response() {
  return Response.json("Hello");
}

export async function init() {
  return server.port;
}

start({ response, init });

function start<T extends Record<any, any>>(handlers: T) {
  expose(handlers);

  server.reload({
    routes: Object.fromEntries(
      Object.entries(handlers).map(([key, value]) => [
        `/handler/${key}`,
        value,
      ]),
    ),
  });
}
