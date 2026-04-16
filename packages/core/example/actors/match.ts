import { Actor, Step, Steps } from "../../src";
import { OptionSubSteps } from "../../src/steps/sub-steps";

const Match: OptionSubSteps & {
  With: OptionSubSteps;
} = {} as never;

const { MyActor } = Actor("MyActor");

export const { match } = MyActor()
  .on("Command", "match")

  .input({ type: "string" })

  .run(
    Match(
      ($) => $.input,

      Match.With(
        { type: "error" },

        Step("Lorem", function () {
          return 3;
        }),
      ),

      Match.With(
        { type: "ok", data: { type: "text" } },
        
        Step("Lorem", function () {
          return 3;
        }),
      ),
    ),
  );
