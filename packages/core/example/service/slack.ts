import { Service } from "../../src/service";

export const { Slack } = Service("Slack")
  .action<SendMessageI, SendMessageO>("sendMessage", "send_message")
  .action<SendMessageI, SendMessageO>("sendMessage", "send_message");
