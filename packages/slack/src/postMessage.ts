import { Step, type TW } from "@taskwish/core";
import { slack } from "./slack";

import { SlackAPIClient } from "slack-web-api-client";
import type {
  ChatPostMessageRequest,
  ChatPostMessageResponse,
} from "slack-web-api-client";

type PostMessageAction = TW.Action<
  "Slack::post_message",
  (input: ChatPostMessageRequest) => Promise<ChatPostMessageResponse>
>;

export const { postMessage }: { postMessage: PostMessageAction } = slack()
  .on("Command", "postMessage")

  .input<ChatPostMessageRequest>()

  .run(
    Step("send", function (): Promise<ChatPostMessageResponse> {
      const client = new SlackAPIClient(this.config("🔑"));

      return client.chat.postMessage(this.input);
    }),
  );
