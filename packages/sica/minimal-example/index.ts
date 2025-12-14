export default App(
  "My automation",

  import("./slack-reply"),

  Provide("env", process.env)
);
