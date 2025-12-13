export default App(
  "My app",
  import("./package"),

  ["GET:/api/say-hello/:language", "example:say-hello"],
  ["CMD:say-hello :language", "example:say-hello"],
  ["GMAIL:pajaziti.bersen@gmail.com", "example:io"],
  ["SLACK:pajaziti.bersen@gmail.com", "example:io"],

  Provide("env", process.env)
);
