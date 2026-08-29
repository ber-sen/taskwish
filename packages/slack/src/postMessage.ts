import { Step } from "@taskwish/core";
import { actor } from "./slack";

import { SlackAPIClient } from "slack-web-api-client";
import type {
  ChatPostMessageRequest,
  ChatPostMessageResponse,
} from "slack-web-api-client";

export const { postMessage } = actor()
  .on("Command", "postMessage")

  .input<ChatPostMessageRequest>()

  .run(
    Step("send", function (): Promise<ChatPostMessageResponse> {
      const client = new SlackAPIClient(process.env.TW_SLACK_API_KEY);

      return client.chat.postMessage(this.input);
    })
  );
