import { Flow } from "../flow";
import { Sica } from "../types";

export const End = <
  FlowMaker extends (...args: any) => Sica.Flow<any, any, null>,
>(
  params: FlowMaker
) =>
  Flow("end").params({
    [Sica.Type]: params as ReturnType<FlowMaker>[typeof Sica.Type],
  });
