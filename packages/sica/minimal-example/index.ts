export default App(
  "My automation",

  ["GMAIL:U05KMUK39UJ #general", import("./io")],

  Provide("env", process.env)
);
