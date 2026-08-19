import { Actor } from "@taskwish/core";

export const { slack } = Actor("Slack").scope(
  Config("🔑", "string"),
);
