export default App(
  "My app",

  ["GET:/api/say-hello/:language", import("./package").helloWold],
  ["CMD:say-hello :language", import("./package").helloWold],
  ["GMAIL:pajaziti.bersen@gmail.com", import("./package").io],
  ["SLACK:U05KMUK39UJ #general", import("./package").io],

  Provide("env", process.env)
);
