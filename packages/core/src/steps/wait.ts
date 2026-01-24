import { StringValue } from "ms";
import { Taskwish } from "../types";

export const Wait = (duration: StringValue) => Flow("wait").params({ duration });

Wait.until = (event: Taskwish.Event<any, any>) => Flow("wait-until").params({ event });
