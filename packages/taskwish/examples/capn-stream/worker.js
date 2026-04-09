import { RpcTarget, newMessagePortRpcSession } from "capnweb";

class StreamService extends RpcTarget {
  streamText(input) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        const words = `hello from capnweb node ${input}`.split(" ");

        let i = 0;

        function push() {
          if (i >= words.length) {
            controller.close();
            return;
          }

          controller.enqueue(words[i]);
          i++;

          setTimeout(push, 200);
        }

        push();
      },
    });

    return stream;
  }
}

self.onmessage = (event) => {
  const port = event.data;
  newMessagePortRpcSession(port, new StreamService());
};
