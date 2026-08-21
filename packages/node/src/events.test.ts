import { expect, test } from "bun:test";
import { Actor, Event, Step } from "@taskwish/core";
import { createFetchHandler, createNodeRegistry } from "./index";
import { apiKey, auth } from "./test-helpers";

test("dispatches stream signal events to registered handlers without waiting", async () => {
  let resolveReceived!: (value: string) => void;
  const received = new Promise<string>((resolve) => {
    resolveReceived = resolve;
  });
  let releaseHandler!: () => void;
  const handlerCanFinish = new Promise<void>((resolve) => {
    releaseHandler = resolve;
  });

  const { hello } = Actor("Greeter")
    .scope(Event("Message", { content: "string" }))
    .actor()
    .on("Command", "hello")

    .input({ name: "string" })

    .run(
      Step("notify", function () {
        return this.signal("Greeter::Message", { content: this.input.name });
      }),

      Step("notify", function () {
        return `Hello ${this.input.name}`;
      })
    );

  const { Greeter } = Actor("Greeter")
    .scope(Event("Message", { content: "string" }))
    .actor()
    .service({ hello });

  const { onGreeterMessage } = Actor("Biller")
    .use(Greeter)
    .actor()
    .on("Greeter::Message")

    .run(async function () {
      resolveReceived(this.input.content);

      await handlerCanFinish;

      return { received: this.input.content };
    });

  const { Biller } = Actor("Biller")
    .use(Greeter)
    .actor()
    .service({ onGreeterMessage });

  const fetch = createFetchHandler(
    createNodeRegistry([Promise.resolve({ Greeter, Biller, hello })]),
    { apiKey }
  );

  const response = await fetch(
    new Request("http://localhost/tw/Greeter/hello", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ada" }),
    })
  );

  expect(response.status).toBe(200);
  expect(await response.text()).toBe("Hello Ada");
  expect(await received).toBe("Ada");
  releaseHandler();
});

test("dispatches built-in event listeners registered on a service", async () => {
  const { actor } = Actor("Greeter");

  let resolveReceived!: (value: string) => void;
  const received = new Promise<string>((resolve) => {
    resolveReceived = resolve;
  });

  const { hello } = actor()
    .on("Command", "hello")

    .input({ name: "string" })

    .run(
      Step("email", function () {
        return this.signal("NewEmail", {
          from: this.input.name,
          to: "support@example.com",
          subject: "Greeting",
          body: "Hello",
        });
      }),

      Step("greet", function () {
        return `Hello ${this.input.name}`;
      })
    );

  const { onNewEmail } = actor()
    .on("NewEmail")

    .run(function () {
      resolveReceived(this.input.from);
      return { received: this.input.subject };
    });

  const { Greeter } = actor().service({
    hello,
    onNewEmail,
  });

  const fetch = createFetchHandler(
    createNodeRegistry([Promise.resolve({ Greeter })]),
    { apiKey }
  );

  const response = await fetch(
    new Request("http://localhost/tw/Greeter/hello", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ada" }),
    })
  );

  expect(response.status).toBe(200);
  expect(await response.text()).toBe("Hello Ada");
  expect(await received).toBe("Ada");
});

test("ignores non-Event objects yielded with signal shape", async () => {
  const received: string[] = [];

  const { hello } = Actor("Greeter")
    .scope(Event("Message", { content: "string" }))
    .actor()
    .on("Command", "hello")

    .run(async function* () {
      yield { "->": "Greeter::Message", content: "Ada" };

      return "Hello Ada";
    });

  const { Greeter } = Actor("Greeter")
    .scope(Event("Message", { content: "string" }))
    .actor()
    .service({ hello });

  const { onGreeterMessage } = Actor("Biller")
    .use(Greeter)
    .actor()
    .on("Greeter::Message")

    .run(function () {
      received.push(this.input.content);
    });

  const { Biller } = Actor("Biller")
    .use(Greeter)
    .actor()
    .service({ onGreeterMessage });

  const fetch = createFetchHandler(
    createNodeRegistry([Promise.resolve({ Greeter, Biller, hello })]),
    { apiKey }
  );

  const response = await fetch(
    new Request("http://localhost/tw/Greeter/hello", {
      method: "POST",
      headers: auth,
    })
  );

  expect(response.status).toBe(200);
  expect(await response.text()).toBe("Hello Ada");
  expect(received).toEqual([]);
});

test("returns the stream final value instead of a yielded value", async () => {
  const { actor } = Actor("Greeter");

  const { streamed } = actor()
    .on("Command", "streamed")

    .run(async function* () {
      yield "yielded result";

      return "final value";
    });

  const fetch = createFetchHandler(
    createNodeRegistry([Promise.resolve({ streamed })]),
    { apiKey }
  );

  const response = await fetch(
    new Request("http://localhost/tw/Greeter/streamed", {
      method: "POST",
      headers: auth,
    })
  );

  expect(response.status).toBe(200);
  expect(await response.text()).toBe("final value");
});
