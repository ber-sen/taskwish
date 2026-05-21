import { expect, test, describe } from "bun:test";
import dedent from "dedent";
import { convert } from "./convert";

describe("convert", () => {
  test("Actor with Command behavior — steps with @{} references", () => {
    const result = convert({
      $: "Actor",
      "=": "SneakyConductor",
      color: "#813ad3",
      behaviors: [
        {
          ">": "Command",
          run: [
            {
              $: "generateText",
              "=": "gent",
              model: "gpt-3.5-turbo-16k",
              prompt: "Let's sumarise  this email: @{subject}",
            },
            {
              $: "Slack.sendMessage",
              "=": "senm",
              text: "@{generatedText}",
              channel: "#general",
            },
          ],
        },
      ],
    });

    expect(result).toEqual(dedent`
      const { SneakyConductor } = Actor("SneakyConductor");

      const { run } = SneakyConductor()
        .on("Command", "run")

        .run(
          Step("gent", function () {
            return this.actions.generateText({
              model: "gpt-3.5-turbo-16k",
              prompt: \`Let's sumarise  this email: \${this.subject}\`,
            });
          }),
          
          Step("senm", function () {
            return this.actions.slack.sendMessage({
              text: this.generatedText,
              channel: "#general",
            });
          }),
        );
    `);
  });

  test("Actor with named Command behavior", () => {
    const result = convert({
      $: "Actor",
      "=": "Greeter",
      behaviors: [
        {
          ">": "Command",
          "=": "greet",
          run: [
            {
              $: "formatMessage",
              "=": "msg",
              template: "Hello, @{name}!",
            },
          ],
        },
      ],
    });

    expect(result).toEqual(dedent`
      const { Greeter } = Actor("Greeter");

      const { greet } = Greeter()
        .on("Command", "greet")

        .run(
          Step("msg", function () {
            return this.actions.formatMessage({
              template: \`Hello, \${this.name}!\`,
            });
          }),
        );
    `);
  });

  test("Actor with event behavior (NewEmail)", () => {
    const result = convert({
      $: "Actor",
      "=": "Mailer",
      behaviors: [
        {
          ">": "NewEmail",
          run: [
            {
              $: "summarise",
              "=": "summary",
              text: "@{subject}",
            },
          ],
        },
      ],
    });

    expect(result).toEqual(dedent`
      const { Mailer } = Actor("Mailer");

      const { onNewEmail } = Mailer()
        .on("NewEmail")

        .run(
          Step("summary", function () {
            return this.actions.summarise({
              text: this.subject,
            });
          }),
        );
    `);
  });

  test("Actor with no behaviors returns just the declaration", () => {
    const result = convert({ $: "Actor", "=": "Empty" });
    expect(result).toEqual(`const { Empty } = Actor("Empty");`);
  });

  test("Step with no params generates call without arguments", () => {
    const result = convert({
      $: "Actor",
      "=": "Pinger",
      behaviors: [
        {
          ">": "Command",
          "=": "ping",
          run: [{ $: "healthCheck", "=": "status" }],
        },
      ],
    });

    expect(result).toEqual(dedent`
      const { Pinger } = Actor("Pinger");

      const { ping } = Pinger()
        .on("Command", "ping")

        .run(
          Step("status", function () {
            return this.actions.healthCheck();
          }),
        );
    `);
  });

  test("multiple behaviors are each emitted as a separate block", () => {
    const result = convert({
      $: "Actor",
      "=": "Hub",
      behaviors: [
        {
          ">": "Command",
          "=": "ping",
          run: [{ $: "echo", "=": "reply", value: "pong" }],
        },
        {
          ">": "NewMessage",
          run: [{ $: "log", "=": "entry", msg: "@{content}" }],
        },
      ],
    });

    expect(result).toEqual(dedent`
      const { Hub } = Actor("Hub");

      const { ping } = Hub()
        .on("Command", "ping")

        .run(
          Step("reply", function () {
            return this.actions.echo({
              value: "pong",
            });
          }),
        );

      const { onNewMessage } = Hub()
        .on("NewMessage")

        .run(
          Step("entry", function () {
            return this.actions.log({
              msg: this.content,
            });
          }),
        );
    `);
  });
});
