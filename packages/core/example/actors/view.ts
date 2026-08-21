"use server";

import { Actor, Step, Event } from "../../src";

const { actor } = Actor("Greeter").scope(
  Event("UserWelcomed", { name: "string" })
);

const Card = {} as any;
const Text = {} as any;
const Actions = {} as any;
const Button = {} as any;
const App = {} as any;
const Screen = {} as any;
const List = {} as any;
const Node = {} as any;
const Widget = {} as any;

export const { hello } = actor()
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
    })
  );

export const { Greeter } = actor().service({ hello });

const { ConnectionsView } = App("Connections", {
  "/": Screen(List()),
});

const { Connections } = ConnectionsView({
  use: [Greeter],
  "/": { name: "List", List: { data: [1, 2, 3] } },
});

const { QuickConnections } = Widget(
  "QuickConnections",

  Card("Lorem", Text("Header"))
)({
  Lorem: { Header: "Hello" },
});

const node = Node({
  workspace: [import("./greeter"), Connections, QuickConnections],
});
