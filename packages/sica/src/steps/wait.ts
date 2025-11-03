import { StringValue } from "ms";
import { Sica } from "../types";

export function Wait(duration: StringValue): Sica.StepOption<"wait", null> {
  return {
    stepOptionType: "wait",
    group: null,
    params: duration,
  } as never;
}

Wait.until = (
  event: Sica.Event<any, any>
): Sica.StepOption<"wait", null> {
  return {} as never
}
