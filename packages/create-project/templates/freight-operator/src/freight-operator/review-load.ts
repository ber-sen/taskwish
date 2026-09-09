import { Step } from "taskwish";

import { parseLoad, validateLoad } from "../shared/load";
import {
  mapOrderRequest,
  powerBrokerConfig,
  submitOrderRequest,
} from "../shared/powerbroker";
import {
  applyOrderResult,
  audit,
  findJob,
  requireRevision,
  viewJob,
  withLoadLock,
} from "../shared/records";
import { actor } from "./freight-operator";

export const { reviewLoad } = actor()
  .on("Command", "reviewLoad")

  .input({
    id: "string",
    revision: "number",
    reviewer: "string",
    decision: "'approve' | 'reject'",
    note: "string",
  })

  .run(
    Step("reviewAndSubmit", async function () {
      return withLoadLock(this.input.id, async () => {
        const job = findJob(this.state.jobs, this.input.id);
        requireRevision(job, this.input.revision);
        if (!["awaitingApproval", "needsCorrection"].includes(job.status))
          throw new Error(`Cannot review a load with status ${job.status}.`);
        const reviewer = this.input.reviewer.trim();
        const note = this.input.note.trim();
        if (!reviewer || !note)
          throw new Error("A human reviewer and review note are required.");
        if (this.input.decision === "reject") {
          job.status = "rejected";
          audit(job, "loadRejected", reviewer, note);
          return { job: viewJob(job), created: false };
        }
        const load = parseLoad(JSON.parse(job.loadJson));
        const issues = validateLoad(load);
        if (issues.length)
          throw new Error(
            `Resolve validation issues before approval: ${issues.join(" ")}`
          );
        const duplicate = this.state.jobs.find(
          (other) =>
            other.id !== job.id &&
            other.customerId === job.customerId &&
            [
              "submitting",
              "submissionUnknown",
              "awaitingOrder",
              "orderCreated",
              "orderDeclined",
            ].includes(other.status) &&
            other.loadJson &&
            parseLoad(JSON.parse(other.loadJson))
              .reference?.trim()
              .toLowerCase() === load.reference?.trim().toLowerCase()
        );
        if (duplicate)
          throw new Error(
            `Reference already submitted as load ${duplicate.id}; reconcile it before creating another order.`
          );
        const config = powerBrokerConfig();
        const payload = mapOrderRequest(load);
        // No await between duplicate check and durable submission marker.
        // This marker deliberately survives a crash or an ambiguous network failure.
        job.status = "submitting";
        audit(job, "loadApproved", reviewer, note);
        try {
          const result = await submitOrderRequest(
            job.customerId,
            job.id,
            payload,
            config
          );
          applyOrderResult(job, result);
        } catch (error) {
          job.status = "submissionUnknown";
          job.error =
            error instanceof Error
              ? error.message
              : "Submission outcome is unknown.";
          audit(job, "submissionUnknown", "system", job.error);
        }
        return { job: viewJob(job), created: job.status === "orderCreated" };
      });
    }),

    Step("publishOrderCreated", async function* () {
      const { job, created } = this.reviewAndSubmit;
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
      "Human approval of a specific revision submits it to McLeod PowerBroker; rejection stops it",
    input: {
      revision: { description: "Revision number from the load you reviewed" },
      reviewer: {
        description: "Operator identity for the audit trail",
        example: "dispatch@example.com",
      },
      decision: { description: "Explicit human decision", example: "approve" },
      note: {
        description:
          "Confirm source, bill-to ID, equipment mapping, rate, and stop time zones",
      },
    },
  });
