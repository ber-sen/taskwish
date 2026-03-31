import { serve } from "bun";
import { expose } from "comlink";

const server = serve({
  port: 0,
  routes: {
    "/api/version": () => Response.json({ version: "2.0.0" }),
  },
});

export const init = () => {
  return server.port;
};

expose({
  init
});
