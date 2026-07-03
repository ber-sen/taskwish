import { expect, test } from "bun:test";
import { Actor, Event, Step } from "@taskwish/core";
import { createFetchHandler, createNodeRegistry } from "./index";
import { apiKey, auth } from "./test-helpers";

test("dispatches stream signal events to registered handlers without waiting", async () => {
  const { Greeter } = Actor("Greeter").def(
    Event("Message", { content: "string" }),
  );
  const { Biller } = Actor("Biller").use(Greeter);

  let resolveReceived!: (value: string) => void;
  const received = new Promise<string>((resolve) => {
    resolveReceived = resolve;
  });
  let releaseHandler!: () => void;
  const handlerCanFinish = new Promise<void>((resolve) => {
    releaseHandler = resolve;
  });

  const { hello } = Greeter()
    .on("Command", "hello")

    .input({ name: "string" })

    .run(
      Step("notify", function () {
        return this.signal("Greeter::Message", { content: this.input.name });
      }),

      Step("notify", function () {
        return `Hello ${this.input.name}`;
      }),
    );

  const { onGreeterMessage } = Biller()
    .on("Greeter::Message")

    .run(async function () {
      resolveReceived(this.input.content);

      await handlerCanFinish;

      return { received: this.input.content };
    });

  const fetch = createFetchHandler(
    createNodeRegistry([
      Promise.resolve({ Greeter, Biller, hello, onGreeterMessage }),
    ]),
    { apiKey },
  );

  const response = await fetch(
    new Request("http://localhost/tw/Greeter/hello", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ada" }),
    }),
  );

  expect(response.status).toBe(200);
  expect(await response.text()).toBe("Hello Ada");
  expect(await received).toBe("Ada");
  releaseHandler();
});

test("ignores non-Event objects yielded with signal shape", async () => {
  const { Greeter } = Actor("Greeter").def(
    Event("Message", { content: "string" }),
  );
  const { Biller } = Actor("Biller").use(Greeter);
  const received: string[] = [];

  const { hello } = Greeter()
    .on("Command", "hello")

    .run(async function* () {
      yield { "->": "Greeter::Message", content: "Ada" };

      return "Hello Ada";
    });

  const { onGreeterMessage } = Biller()
    .on("Greeter::Message")

    .run(function () {
      received.push(this.input.content);
    });

  const fetch = createFetchHandler(
    createNodeRegistry([
      Promise.resolve({ Greeter, Biller, hello, onGreeterMessage }),
    ]),
    { apiKey },
  );

  const response = await fetch(
    new Request("http://localhost/tw/Greeter/hello", {
      method: "POST",
      headers: auth,
    }),
  );

  expect(response.status).toBe(200);
  expect(await response.text()).toBe("Hello Ada");
  expect(received).toEqual([]);
});

test("returns the stream final value instead of a yielded result event", async () => {
  const { Greeter } = Actor("Greeter");

  const { streamed } = Greeter()
    .on("Command", "streamed")

    .run(async function* () {
      yield { ">>": "Greeter::streamed", result: "yielded result" };

      return "final value";
    });

  const fetch = createFetchHandler(
    createNodeRegistry([Promise.resolve({ streamed })]),
    { apiKey },
  );

  const response = await fetch(
    new Request("http://localhost/tw/Greeter/streamed", {
      method: "POST",
      headers: auth,
    }),
  );

  expect(response.status).toBe(200);
  expect(await response.text()).toBe("final value");
});
