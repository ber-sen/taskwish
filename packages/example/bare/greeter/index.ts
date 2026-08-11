import { hello, helloRun, helloStream } from "./hello";

export const Greeter = {
  hello,
  run: {
    hello: helloRun,
  },
  stream: {
    hello: helloStream,
  }
};
