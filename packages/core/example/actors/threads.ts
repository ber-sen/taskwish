"use server";

import { Actor, Step, Steps, SubSteps, TW } from "../../src";

export const Reply = {} as <Ctx>(prompt: string) => {
  [TW.Step]: (ctx: Ctx) => Ctx;
};

export const Commander: {
  Notify: <Ctx>(prompt: string) => {
    [TW.Step]: (ctx: Ctx) => Ctx;
  };
  NeedsApproval: Steps<typeof SubSteps>;
} = {} as never;

const { Greeter } = Actor("Greeter");

Greeter()
  .on("NewMessage")

  .run(
    Commander.Notify("asdasddas"),

    Commander.NeedsApproval(
      Step("first step", function () {
        return this.actions.slack.sendMessage({
          channel: "#general",
          message: "Hello World",
        });
      }),
    ),

    Reply("asdasddas"),
  );
