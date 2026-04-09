import { encode } from "cbor2";

self.onmessage = (event) => {
  const port = event.data.port;

  port.start();

  const message = encode({ hello: "world" });

  console.log("worker");
  console.log(message);

  port.postMessage({ message }, [message.buffer]);

  pipeGeneratorToPort(stream(), port);
};
