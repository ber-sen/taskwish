import { RpcSession } from "capnweb";

export function newMessagePortRpcSession(port, localMain, p) {
  const transport = new MessagePortTransport(port, p);
  const rpc = new RpcSession(transport, localMain);
  return rpc.getRemoteMain();
}

export class MessagePortTransport {
  #port;
  #error;
  #receiveQueue = [];
  #receiveResolver;
  #receiveRejecter;

  constructor(port, p) {
    this.#port = port;

    port.start();

    port.addEventListener("message", (event) => {
      if (this.#error) {
        return;
      }

      // if (!p) {
        console.log({ p, data: event.data });
      // }

      if (event.data === null) {
        this.#receivedError(new Error("Peer closed MessagePort connection."));
        return;
      }

      if (typeof event.data === "string") {
        if (this.#receiveResolver) {
          this.#receiveResolver(event.data);
          this.#receiveResolver = undefined;
          this.#receiveRejecter = undefined;
        } else {
          this.#receiveQueue.push(event.data);
        }
        return;
      }
    });

    port.addEventListener("messageerror", () => {
      this.#receivedError(new Error("MessagePort message error."));
    });
  }

  async send(message) {
    if (this.#error) {
      throw this.#error;
    }

    this.#port.postMessage(message);
  }

  async receive() {
    if (this.#receiveQueue.length > 0) {
      return this.#receiveQueue.shift();
    }

    if (this.#error) {
      throw this.#error;
    }

    return new Promise((resolve, reject) => {
      this.#receiveResolver = resolve;
      this.#receiveRejecter = reject;
    });
  }

  abort(reason) {
    try {
      this.#port.postMessage(null);
    } catch (err) {
      // ignore
    }

    this.#port.close();

    if (!this.#error) {
      this.#error = reason;
    }
  }

  #receivedError(reason) {
    if (this.#error) return;

    this.#error = reason;

    if (this.#receiveRejecter) {
      this.#receiveRejecter(reason);
      this.#receiveResolver = undefined;
      this.#receiveRejecter = undefined;
    }
  }
}
