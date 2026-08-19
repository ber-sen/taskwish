import { Actor } from "@taskwish/core";

export const { slack } = Actor("Slack").scope(
  Config("🔑", "string", process.env.TW_SLACK_API_KEY),
);
