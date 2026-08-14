import { Actor, ScopeResultKind, Step, Steps, TW } from "../../src";

interface Commander {
  <
    Ctx extends Record<string, any>,
    const Options extends {
      service: "telegram";
      bot: string;
      rewriteItself?: boolean;
    },
  >(
    options: Options,
  ): {
    [TW.Step]: (ctx: Ctx) => {
      name: Ctx["name"];
      steps: Ctx["steps"];
      step: Ctx["step"];
      scope: Record<"commander", Options> & Ctx["scope"];
      last: Options;
      plugins: Ctx["plugins"];
    };
  };
  NeedsApproval: Steps<{}, ScopeResultKind>;
}

export const Commander: Commander = {} as never;

const { commandedActor } = Actor("CommandedActor").scope(
  Commander({
    service: "telegram",
    bot: "taskwish_bot",
    rewriteItself: true,
  }),
);

export const { chat } = commandedActor()
  .on("Command", "chat")

  .input({ name: "string" })

  .run(
    Commander.NeedsApproval(
      Step("run", function () {
        return this.abortSignal;
      }),
    ),
  );
