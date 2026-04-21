import { MCPService } from "../../src/service";

export const { Slack } = MCPService("Slack")
  .run({
      "command": "npx",
      "args": [
        "@playwright/mcp@latest"
      ]
  })
  .action<SendMessageI, SendMessageO>("sendMessage", "send_message")
  .action<SendMessageI, SendMessageO>("sendMessage", "send_message")
  .build()

  
const slack = Slack()
slack.sendMessage({ channel: "#general", message: "Hello" })
