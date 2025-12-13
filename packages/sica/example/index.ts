export default App(
  "My app",
  import("./package"),

  ["GET", "/api/say-hello/:language", "example::helloWold"],
  ["CMD", "say-hello :language", "example::helloWold"],
  ["GMAIL", "pajaziti.bersen@gmail.com", "example::io"],
  ["SLACK", "pajaziti.bersen@gmail.com", "example::io"],

  Provide("env", process.env)
);
