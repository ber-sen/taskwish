import { Step } from "@taskwish/core";
import { slack } from "./slack";

import { SlackAPIClient } from "slack-web-api-client";
import type { ChatPostMessageRequest } from "slack-web-api-client";

export const { postMessage } = slack()
  .on("Command", "postMessage")

  .input<ChatPostMessageRequest>()

  .run(
    Step("send", function () {
      const client = new SlackAPIClient(process.env.TW_SLACK_API_KEY);

      return client.chat.postMessage(this.input);
    }),
  );
