import { Service } from "../../src/service";

const { Slack } = Service("Slack");

// hello action
export const { postMessage } = Slack()
  .action("postMessage")

  .input<{ channel: string }>()

  .run(function () {
    return this.connection.client.callTool({
      name: "post_message",
      arguments: this.input,
    });
  });
