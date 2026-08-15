import { Actor, ScopeResultKind, Step, Steps, TW } from "../../src";

interface Commander {
  Bot<
    Ctx extends Record<string, any>,
    const Options extends {
      service: "telegram";
      username: string;
      allow?: {
        users?: string[]
      }
      agent: {
        instructions?: string;
        tools?: string[];
      };
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
  Commander.Bot({
    service: "telegram",
    username: "taskwish_bot",
    allow: {
      users: ["+38344123456"],
    },
    agent: {
      tools: ["browse"],
    },
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
