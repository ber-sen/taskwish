import {
  Actor,
  ScopeResultKind,
  Step,
  Steps,
  SubSteps,
  SubStepsResultKind,
  TW,
} from "../../src";

interface Commander {
  Bot<
    Ctx extends Record<string, any>,
    const Options extends {
      service: "telegram";
      username: string;
      allow?: {
        users?: string[];
      };
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
  Notify: <Ctx extends Record<string, any>>(
    msg: string,
  ) => {
    [TW.Step]: (ctx: Ctx) => {
      name: Ctx["name"];
      steps: Ctx["steps"];
      step: Ctx["step"];
      scope: Ctx["scope"];
      last: Ctx["last"];
      plugins: Ctx["plugins"];
    };
  };
  NeedsApproval: Steps<typeof SubSteps, SubStepsResultKind>;
}

export const Commander: Commander = {} as never;

const { commanded } = Actor("Commanded").scope(
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

export const { refundPayment } = commanded()
  .on("Command", "refundPayment")

  .input({
    paymentId: "string",
    amount: "number",
  })

  .run(
    Commander.NeedsApproval(
      Step("refund", function () {
        return this.actions.stripe.refund({
          paymentId: this.input.paymentId,
          amount: this.input.amount,
        });
      }),
    ),
  );
