export default App(
  "My automation",

  import("./io"),

  Provide("env", process.env)
);
