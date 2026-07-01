import { Server } from "@taskwish/server";

import { startupMessage } from "./help";

const server = await Server({
  services: [import("./greeter"), import("./biller")],
  apiKey: process.env.TW_API_KEY,
  port: Number(process.env.PORT ?? 3000),
});

console.log(startupMessage(server.url.origin, server.apiKey));
