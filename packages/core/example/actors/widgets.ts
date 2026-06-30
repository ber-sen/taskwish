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

export const { hello } = Greeter()
  .on("Command", "hello")

  .input({ name: "string" })

  .run(
    Card("Lorem", Text("Header"), Actions(Button("Primary"), Button)),

    Step("greet", function () {
      return this.reply("Lorem", {
        Header: "Your order has been received!",
        Primary: { id: "approve", label: "Approve", style: "primary" },
        Button: { id: "approve", label: "Approve", style: "primary" },
      });
    }),
  );

const { Credentials } = App("Credentials", {
  "/": Screen(List()),
});

const app = Credentials({
  "/": { name: "List", List: { data: [1, 2, 3] } },
});
