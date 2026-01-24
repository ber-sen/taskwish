import { Flow } from "../flow";

export const Source = {
  pipeTo: (destination: WritableStream) =>
    Flow("pipeTo").params({ destination }),
};
