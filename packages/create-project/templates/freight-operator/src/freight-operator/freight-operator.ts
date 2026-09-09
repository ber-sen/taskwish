import { Actor, Event, State } from "taskwish";

import { Documents } from "../documents";
import { Emails } from "../emails";
import { Gmail } from "../gmail";
import { LoadExtractor } from "../load-extractor";

const { actor: createActor } = Actor("FreightOperator").scope(
  Event("OrderCreated", {
    id: "string",
    requestId: "string",
    orderId: "string",
  }),

  State({
    jobs: State.List({
      id: "primary.uuidv4.random",
      sourceId: "string",
      customerId: "string",
      sourceHash: "string",
      status: "string",
      revision: "number",
      markdown: "string",
      loadJson: "string",
      issuesJson: "string",
      auditJson: "string",
      requestId: "string",
      orderId: "string",
      error: "string",
      createdAt: "string",
      updatedAt: "string",
    }),
  })
);

export const actor = () =>
  createActor().use(Documents).use(Emails).use(Gmail).use(LoadExtractor);
