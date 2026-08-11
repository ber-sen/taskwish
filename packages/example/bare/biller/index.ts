import {
  onGreeterMessage,
  run_onGreeterMessage,
  stream_onGreeterMessage,
} from "./on-greeter-message";

export const Biller = {
  onGreeterMessage,
  run: {
    onGreeterMessage: run_onGreeterMessage,
  },
  stream: {
    onGreeterMessage: stream_onGreeterMessage,
  },
};
