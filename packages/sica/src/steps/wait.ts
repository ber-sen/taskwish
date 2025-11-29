import { StringValue } from "ms";
import { Sica } from "../types";
import { Flow } from "../flow";

export const Wait = (duration: StringValue) => Flow("wait").params({ duration });

Wait.until = (event: Sica.Event<any, any>) => Flow("wait-until").params({ event });
