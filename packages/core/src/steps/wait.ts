import { StringValue } from "ms";
import { TW } from "../core";

export const Wait = (duration: StringValue) => Flow("wait").params({ duration });

Wait.until = (event: TW.Event<any, any>) => Flow("wait-until").params({ event });
