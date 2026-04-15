import { secrets } from "bun";

// await secrets.set({
//   service: "my-app",
//   name: "api-key",
//   value: "secret-value",
// });

const value = await secrets.get({
  service: "my-app",
  name: "api-key",
});

console.log(value);
