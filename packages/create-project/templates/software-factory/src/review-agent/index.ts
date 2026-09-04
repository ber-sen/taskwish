import { actor } from "./review-agent";
import { onCodingAgentChangeProposed } from "./on-change-proposed";

export const { ReviewAgent } = actor().service({
  onCodingAgentChangeProposed,
});
