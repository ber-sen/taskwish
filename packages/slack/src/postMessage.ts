import { Step } from "@taskwish/core";
import { Slack } from "./slack";

import { SlackAPIClient } from "slack-web-api-client";
import type { ChatPostMessageRequest } from "slack-web-api-client";

export const { postMessage } = Slack()
  .on("Command", "postMessage")

  .input<ChatPostMessageRequest>()

  .run(
    Step("send", function () {
      const client = new SlackAPIClient(process.env.SLACK_BOT_TOKEN);

      return client.chat.postMessage(this.input);
    }),
  );
