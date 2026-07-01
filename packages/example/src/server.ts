import { Server } from "@taskwish/server";

const server = await Server({
  services: [import("./greeter"), import("./biller")],
  apiKey: process.env.TW_API_KEY,
  port: Number(process.env.PORT ?? 3000),
});

const baseUrl = server.url.origin;

console.log(`Taskwish example server listening on ${baseUrl}`);
console.log(`API key: ${server.apiKey}`);
console.log("");
console.log("Greeter action:");
console.log(
  `curl -H "Authorization: Bearer ${server.apiKey}" "${baseUrl}/tw/Greeter::hello?name=Ada"`,
);
console.log("");
console.log("Biller receiving Greeter Message:");
console.log(
  `curl -X POST -H "Authorization: Bearer ${server.apiKey}" -H "Content-Type: application/json" -d '{"content":"hi"}' "${baseUrl}/tw/Biller::on_greeter_message"`,
);
