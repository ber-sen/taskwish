import { morphDir } from "@taskwish/bare";

await Promise.all([
  morphDir("./biller"),
  morphDir("./browser"),
  morphDir("./greeter"),
  morphDir("./hacker-news"),
]);
