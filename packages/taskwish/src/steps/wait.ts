import { StringValue } from "ms";
import { TaskWish } from "../types";

export function Wait(duration: StringValue): TaskWish.StepOption<"wait", null>;

export function Wait(
  event: TaskWish.Event<any, any>
): TaskWish.StepOption<"wait", null>;

export function Wait(...args: any) {
  return {
    stepOptionType: "wait",
    group: null,
    params: args,
  } as never;
}
