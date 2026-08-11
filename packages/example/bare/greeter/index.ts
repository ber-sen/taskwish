import { hello, run_hello, stream_hello } from "./hello";

export const Greeter = {
  hello,
  run: {
    hello: run_hello,
  },
  stream: {
    hello: stream_hello,
  },
};
