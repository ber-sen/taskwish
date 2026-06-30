"use server";

import { Actor, Step, Event } from "../../src";

export const { Greeter } = Actor("Greeter").def(
  Event("UserWelcomed", { name: "string" }),
);

export const { hello } = Greeter()
  .on("Command", "hello")

  .input({ name: "string" })

  .run(
    Card(Text, Actions([Button, Button])).as("Lorem"),

    Step("greet", function () {
      return this.reply("Lorem", {
        title: "Order #1234",
        content: [
          "Your order has been received!",
          [
            { id: "approve", label: "Approve", style: "primary" },
            { id: "approve", label: "Approve", style: "primary" },
          ],
        ],
      });
    }),
  );

const { Credentials } = App("Credentials", {
  "/": Screen(List()),
});

const app = Credentials({
  "/": { name: "List", content: [{ data: [1, 2, 3] }] },
});
