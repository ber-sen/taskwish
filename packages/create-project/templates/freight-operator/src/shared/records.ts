import { createHash } from "node:crypto";

import { parseLoad } from "./load";
import type { OrderResult } from "./powerbroker";

export type Job = {
  id: string;
  sourceId: string;
  customerId: string;
  sourceHash: string;
  status: string;
  revision: number;
  markdown: string;
  loadJson: string;
  issuesJson: string;
  auditJson: string;
  requestId: string;
  orderId: string;
  error: string;
  createdAt: string;
  updatedAt: string;
};

export function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function findJob(jobs: Job[], id: string): Job {
  const job = jobs.find((item) => item.id === id);
  if (!job) throw new Error(`Load ${id} does not exist.`);
  return job;
}

export function requireRevision(job: Job, revision: number) {
  if (job.revision !== revision)
    throw new Error(
      "This review is stale. Reload the load and review its current revision."
    );
}

export function audit(job: Job, event: string, reviewer = "system", note = "") {
  job.updatedAt = new Date().toISOString();
  const entries = JSON.parse(job.auditJson) as unknown[];
  entries.push({
    event,
    reviewer,
    note,
    revision: job.revision,
    at: job.updatedAt,
    ...([
      "awaitingApproval",
      "needsCorrection",
      "loadRevised",
      "loadApproved",
    ].includes(event) && job.loadJson
      ? { load: JSON.parse(job.loadJson) as unknown }
      : {}),
  });
  job.auditJson = JSON.stringify(entries);
}

export function viewJob(job: Job) {
  const { loadJson, issuesJson, auditJson, ...rest } = job;
  return {
    ...rest,
    load: loadJson ? parseLoad(JSON.parse(loadJson)) : null,
    issues: JSON.parse(issuesJson) as string[],
    audit: JSON.parse(auditJson) as unknown[],
  };
}

export function applyOrderResult(job: Job, result: OrderResult) {
  job.requestId = result.requestId;
  job.orderId = result.orderId;
  job.error = result.reason;
  job.status = result.orderId
    ? "orderCreated"
    : result.action === "Declined"
    ? "orderDeclined"
    : "awaitingOrder";
  audit(job, job.status, "McLeod", result.reason);
}

// One server process owns the local store. Reject overlapping actions instead
// of queueing decisions against an outdated review.
const active = new Set<string>();
export async function withLoadLock<T>(
  key: string,
  run: () => Promise<T>
): Promise<T> {
  if (active.has(key))
    throw new Error(
      "This load is being processed. Refresh before trying again."
    );
  active.add(key);
  try {
    return await run();
  } finally {
    active.delete(key);
  }
}
