import { Step } from "taskwish";

import { parseLoad } from "../shared/load";
import { getOrderRequest } from "../shared/powerbroker";
import {
  applyOrderResult,
  audit,
  findJob,
  viewJob,
  withLoadLock,
} from "../shared/records";
import { actor } from "./freight-operator";

export const { refreshOrder } = actor()
  .on("Command", "refreshOrder")

  .input({
    id: "string",
    "requestId?": "string",
    "reviewer?": "string",
    "note?": "string",
  })

  .run(
    Step("checkOrderRequest", async function () {
      return withLoadLock(this.input.id, async () => {
        const job = findJob(this.state.jobs, this.input.id);
        if (
          ![
            "awaitingOrder",
            "submissionUnknown",
            "submitting",
            "orderDeclined",
            "orderCreated",
          ].includes(job.status)
        )
          throw new Error("This load has not been submitted.");
        const wasCreated = job.status === "orderCreated";
        if (wasCreated) return { job: viewJob(job), created: false };
        const requestId = job.requestId || this.input.requestId?.trim();
        if (!requestId)
          throw new Error(
            "Find the order request in McLeod using the load ID/correlation ID and BOL, then provide requestId, reviewer, and note. Do not resubmit."
          );
        if (
          job.requestId &&
          this.input.requestId &&
          job.requestId !== this.input.requestId
        )
          throw new Error("Cannot replace an existing McLeod request ID.");
        if (
          !job.requestId &&
          (!this.input.reviewer?.trim() || !this.input.note?.trim())
        )
          throw new Error(
            "Reconciliation requires a reviewer and note confirming the McLeod request belongs to this load."
          );
        const result = await getOrderRequest(job.customerId, requestId);
        const reference = parseLoad(JSON.parse(job.loadJson))
          .reference?.trim()
          .toLowerCase();
        if (
          !job.requestId &&
          (!result.reference || result.reference.toLowerCase() !== reference)
        )
          throw new Error(
            "The McLeod request BOL does not match this load; reconciliation stopped."
          );
        if (!job.requestId)
          audit(
            job,
            "submissionReconciled",
            this.input.reviewer!.trim(),
            this.input.note!.trim()
          );
        applyOrderResult(job, result);
        return {
          job: viewJob(job),
          created: !wasCreated && job.status === "orderCreated",
        };
      });
    }),

    Step("publishOrderCreated", async function* () {
      const { job, created } = this.checkOrderRequest;
      if (created)
        yield* this.signal("FreightOperator::OrderCreated", {
          id: job.id,
          requestId: job.requestId,
          orderId: job.orderId,
        });
      return job;
    })
  )

  .meta({
    description:
      "Check a submitted McLeod request for its order ID, or reconcile an ambiguous submission with a verified request ID",
  });
