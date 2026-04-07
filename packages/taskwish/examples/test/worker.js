// const { parentPort } = require("worker_threads");

// import { randomBytes } from "crypto";

// const random = randomBytes(16);
// const buffer = random.buffer.slice(
//   random.byteOffset,
//   random.byteOffset + random.byteLength,
// );

// parentPort.postMessage({ buffer }, { transfer: [buffer] });

// globalThis.addEventListener("message", (message) => {
//   console.log(message);
// });

const bc = new BroadcastChannel("tasks");

function serializeError(err) {
  return {
    message: err && err.message,
    stack: err && err.stack,
    name: err && err.name,
  };
}

async function pipeGeneratorToPort(gen, port) {
  try {
    // supports both sync + async generators
    for await (const value of gen) {
      if (value instanceof ArrayBuffer) {
        port.postMessage({ type: "yield", value }, [value]); // zero-copy
      } else {
        port.postMessage({ type: "yield", value });
      }
    }

    port.postMessage({ type: "return" });
  } catch (err) {
    port.postMessage({ type: "throw", error: serializeError(err) });
  }
}

self.onmessage = (event) => {
  const port = event.data.port;

  port.onmessage = (msg) => {
    // handle incoming if needed
  };

  port.start();

  async function* stream() {
    yield "a";
    yield "b";

    const buf = new ArrayBuffer(8);
    yield buf;

    return "done";
  }

  pipeGeneratorToPort(stream(), port);
};

bc.onmessage = (event) => {
  const { port1 } = new MessageChannel();
  bc.postMessage({ port1 }, [port1]);
};

bc.postMessage("This is a test message.");
