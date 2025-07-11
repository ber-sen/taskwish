const wasm = require("./pkg/taskwish_rs.js");

async function main() {
  console.log(wasm.hello());
}
main();

