import { onGreeterMessage, onGreeterMessageRun, onGreeterMessageStream } from "./on-greeter-message";

export const Biller = {
  onGreeterMessage,
  run: {
    onGreeterMessage: onGreeterMessageRun,
  },
  stream: {
    onGreeterMessage: onGreeterMessageStream,
  }
};
