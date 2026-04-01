import { serve } from "bun";
import { expose, transferHandlers } from "comlink";
import { asyncGeneratorTransferHandler } from "./transfer"

transferHandlers.set("async", asyncGeneratorTransferHandler)

const server = serve({
  port: 0,
  routes: {
    "/api/version": () => Response.json({ version: "2.0.0" }),
  },
});

export const init = () => {
  return new Response("test")
};

expose({
  init
});
