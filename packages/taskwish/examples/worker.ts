import { serve } from "bun";

// prevents TS errors
declare var self: Worker;

const server = serve({
  port: 0,
  routes: {
    "/api/version": () => Response.json({ version: "2.0.0" }),
  },
});

self.onmessage = (event: MessageEvent) => {
  postMessage(server.port);
};
