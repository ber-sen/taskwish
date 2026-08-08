import { slack } from "./slack";
import { postMessage } from "./postMessage";

export const { Slack } = slack().service({ postMessage });
