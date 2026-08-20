import { type TW } from "@taskwish/core";
import type { ChatPostMessageRequest, ChatPostMessageResponse } from "slack-web-api-client";
type PostMessageAction = TW.Action<"Slack::post_message", (input: ChatPostMessageRequest) => Promise<ChatPostMessageResponse>>;
export declare const postMessage: PostMessageAction;
export {};
