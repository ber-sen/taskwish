"use server";

import { Actor, Step, Event } from "../../src";

export const { Greeter } = Actor("Greeter").def(
  Event("UserWelcomed", { name: "string" }),
);

const Card = {} as any;
const Text = {} as any;
const Actions = {} as any;
const Button = {} as any;
const App = {} as any;
const Screen = {} as any;
const List = {} as any;
const Server = {} as any

export const { hello } = Greeter()
  .on("Command", "hello")

  .input({ name: "string" })

  .run(
    Card("Lorem", Text("Header"), Actions(Button("Cta"), Button)),

    Step("greet", function () {
      return this.reply("Lorem", {
        Header: "Your order has been received!",
        Cta: { id: "approve", label: "Approve", style: "primary" },
        Button: { id: "cancel", label: "Cancel" },
      });
    }),
  );

const { Credentials } = App("Credentials", {
  use: [Greeter],
  "/": Screen(List()),
});

const credentials = Credentials({
  "/": { name: "List", List: { data: [1, 2, 3] } },
});

const server = Server({
  services: [import("./greeter")],
  apps: [credentials]
})