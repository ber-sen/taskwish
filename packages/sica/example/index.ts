export default App(
  "My app",
  import("./package"),

  {
    "GET:/api/say-hello/:language": ({ example }) => example.helloWold,
    "CMD:say-hello :language": (app) => app.example.helloWold,
    "GMAIL:pajaziti.bersen@gmail.com": (app) => app.example.io,
    "SLACK:pajaziti.bersen@gmail.com": (app) =>
      app.example.io({ from: "lorem@ipsum" }),
  },

  Provide("env", process.env)
);
