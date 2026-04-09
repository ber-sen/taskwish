import { randomBytes } from "crypto";

self.onmessage = (event) => {
  const port = event.data.port;

  port.start();

  const random = randomBytes(16);

  const buffer = random.buffer.slice(
    random.byteOffset,
    random.byteOffset + random.byteLength,
  );

  console.log("worker");
  console.log(buffer);

  port.postMessage({ buffer }, [buffer]);

  pipeGeneratorToPort(stream(), port);
};
