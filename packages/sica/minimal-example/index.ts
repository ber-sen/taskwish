export default App(
  "My automation",

  ["GMAIL:U05KMUK39UJ #general", import("./io")],

  Slack(import("./io")).user("U05KMUK39UJ").channel("#general"),

  Provide("env", process.env)
);
