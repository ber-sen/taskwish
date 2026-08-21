import { actor } from "./slack";
import { postMessage } from "./postMessage";

export const { Slack } = actor().service({ postMessage });
