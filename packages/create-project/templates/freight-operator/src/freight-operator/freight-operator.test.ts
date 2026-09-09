import { afterAll, afterEach, beforeAll, expect, mock, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { mapOrderRequest } from "../shared/powerbroker";
import { validateLoad } from "../shared/load";
import { mockState, sampleLoad } from "../shared/test-helpers";

let FreightOperator: typeof import(".").FreightOperator;
let directory: string;
const originalStore = process.env.TW_DEFAULT_STORE_PATH;
const originalFetch = globalThis.fetch;
const envNames = [
  "MCLEOD_BASE_URL",
  "MCLEOD_AUTHORIZATION",
  "MCLEOD_API_KEY",
  "MCLEOD_TENANT",
  "MCLEOD_FUSION_PROFILE",
];
const originalEnv = Object.fromEntries(
  envNames.map((name) => [name, process.env[name]])
);

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "taskwish-freight-test-"));
  process.env.TW_DEFAULT_STORE_PATH = join(directory, "state");
  ({ FreightOperator } = await import("."));
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const name of envNames) {
    if (originalEnv[name] === undefined) delete process.env[name];
    else process.env[name] = originalEnv[name];
  }
});
afterAll(async () => {
  if (originalStore === undefined) delete process.env.TW_DEFAULT_STORE_PATH;
  else process.env.TW_DEFAULT_STORE_PATH = originalStore;
  await rm(directory, { recursive: true, force: true });
});

function setup(load = sampleLoad()) {
  const state = mockState();
  const readDocuments = mock(async () => ({ markdown: "Document tender" }));
  const readEmail = mock(async () => ({ markdown: "Source tender" }));
  const extractLoad = mock(async () => load);
  const actions = {
    documents: { readDocuments },
    emails: { readEmail },
    loadExtractor: { extractLoad },
  };
  const receive = (sourceId = "message-1042") =>
    FreightOperator.receiveLoad
      .ctx({ state, actions })
      .run({ sourceId, customerId: "1CHC", emailText: "Book BOL-1042" });
  const review = (
    id: string,
    decision: "approve" | "reject" = "approve",
    revision = 1
  ) =>
    FreightOperator.reviewLoad.ctx({ state }).run({
      id,
      revision,
      decision,
      reviewer: "dispatcher",
      note: "Verified source and customer mapping.",
    });
  return {
    state,
    actions,
    receive,
    review,
    readDocuments,
    readEmail,
    extractLoad,
  };
}

function mockMcLeod(
  result: unknown = {
    requestId: "request-42",
    status: { action: "PendingInput" },
  }
) {
  process.env.MCLEOD_BASE_URL =
    "https://api.mcleodsoftware.com/ordercreation-sandbox";
  process.env.MCLEOD_AUTHORIZATION = "test-authorization";
  process.env.MCLEOD_API_KEY = "test-api-key";
  process.env.MCLEOD_TENANT = "2";
  process.env.MCLEOD_FUSION_PROFILE = "freight";
  const fetchMock = mock(
    async (_url: string | URL | Request, _options?: RequestInit) =>
      Response.json(result)
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

test("intake extracts once, persists review, and never submits before approval", async () => {
  const context = setup();
  const remote = mockMcLeod();
  const job = await context.receive();
  expect(job.status).toBe("awaitingApproval");
  expect(job.revision).toBe(1);
  expect(job.markdown).toBe("Source tender");
  expect(context.readEmail).toHaveBeenCalledTimes(1);
  expect(context.readDocuments).not.toHaveBeenCalled();
  expect((await context.receive()).id).toBe(job.id);
  expect(context.extractLoad).toHaveBeenCalledTimes(1);
  expect(remote).not.toHaveBeenCalled();
  expect(
    await FreightOperator.listLoads
      .ctx({ state: context.state })
      .run({ status: "awaitingApproval" })
  ).toHaveLength(1);
});

test("combines email and document actor output before extraction", async () => {
  const context = setup();
  const job = await FreightOperator.receiveLoad
    .ctx({ state: context.state, actions: context.actions })
    .run({
      sourceId: "mixed-source",
      customerId: "1CHC",
      emailText: "Book BOL-1042",
      attachments: [{ name: "tender.csv", contentBase64: "YQ==" }],
    });

  expect(job.markdown).toBe("Source tender\n\n---\n\nDocument tender");
  expect(context.readEmail).toHaveBeenCalledTimes(1);
  expect(context.readDocuments).toHaveBeenCalledTimes(1);
  expect(context.extractLoad).toHaveBeenCalledWith({ markdown: job.markdown });
});

test("validation blocks missing, conflicting, and invalid loads", async () => {
  const load = sampleLoad();
  load.weightLb = -10;
  load.currency = "EUR";
  load.hazmat = null;
  load.stops[0]!.arrivalEarly = "2026-02-30T09:00:00-05:00";
  load.concerns = ["Email and PDF disagree on the rate."];
  const context = setup(load);
  const job = await context.receive();
  expect(job.status).toBe("needsCorrection");
  expect(job.issues.length).toBeGreaterThanOrEqual(5);
  const remote = mockMcLeod();
  await expect(context.review(job.id)).rejects.toThrow("Resolve validation");
  expect(remote).not.toHaveBeenCalled();
});

test("correction increments revision and invalidates stale approval", async () => {
  const context = setup();
  const job = await context.receive();
  const revised = await FreightOperator.reviseLoad
    .ctx({ state: context.state })
    .run({
      id: job.id,
      revision: 1,
      reviewer: "operator",
      note: "Confirmed updated rate",
      load: { ...sampleLoad(), linehaul: 2000 },
    });
  expect(revised.revision).toBe(2);
  expect(revised.status).toBe("awaitingApproval");
  await expect(context.review(job.id)).rejects.toThrow("stale");
  const remote = mockMcLeod();
  await context.review(job.id, "approve", 2);
  const body = JSON.parse(remote.mock.calls[0]![1]!.body as string);
  expect(body.rating.linehaulCharge.value).toBe(2000);
});

test("human rejection never calls McLeod", async () => {
  const context = setup();
  const job = await context.receive();
  const remote = mockMcLeod();
  expect((await context.review(job.id, "reject")).status).toBe("rejected");
  await expect(context.review(job.id)).rejects.toThrow("Cannot review");
  expect(remote).not.toHaveBeenCalled();
});

test("approval uses the documented McLeod contract and waits for an actual order ID", async () => {
  const context = setup();
  const job = await context.receive();
  const remote = mockMcLeod();
  const submitted = await context.review(job.id);
  expect(submitted.status).toBe("awaitingOrder");
  expect(submitted.orderId).toBe("");
  const [url, options] = remote.mock.calls[0]!;
  expect(url).toBe(
    "https://api.mcleodsoftware.com/ordercreation-sandbox/customers/1CHC/order-requests"
  );
  expect(options!.headers).toMatchObject({
    Authorization: "test-authorization",
    "X-Api-Key": "test-api-key",
    "X-Mcld-Tenant": "2",
    "X-Mcld-Fusion-Profile": "freight",
    "X-Correlation-Id": job.id,
  });
  const payload = JSON.parse(options!.body as string);
  expect(payload.orderReferenceNumbers).toEqual({ bol: "BOL-1042" });
  expect(payload.stops[0]).toMatchObject({
    stopType: "Pickup",
    cityName: "Chicago",
    scheduledArrivalEarly: "2026-10-12T08:00:00-05:00",
  });
  expect(payload.requestId).toBeUndefined();
  expect(payload.status).toBeUndefined();
  await expect(context.review(job.id)).rejects.toThrow("Cannot review");
  mockMcLeod({
    requestId: "request-42",
    status: { action: "Accepted", orderId: "0261573" },
  });
  const events: unknown[] = [];
  for await (const event of FreightOperator.refreshOrder
    .ctx({ state: context.state })
    .stream({ id: job.id }))
    events.push(event);
  expect(context.state.jobs[0]!.status).toBe("orderCreated");
  expect(
    events.some(
      (event) =>
        typeof event === "object" &&
        event !== null &&
        "event" in event &&
        event.event === "FreightOperator::OrderCreated"
    )
  ).toBe(true);
});

test("duplicate BOLs and concurrent approval cannot create a second request", async () => {
  const context = setup();
  const job = await context.receive();
  const other = await context.receive("another-email");
  const remote = mockMcLeod();
  const outcomes = await Promise.allSettled([
    context.review(job.id),
    context.review(job.id),
    context.review(other.id),
  ]);
  expect(
    outcomes.filter((outcome) => outcome.status === "fulfilled")
  ).toHaveLength(1);
  expect(remote).toHaveBeenCalledTimes(1);
});

test("unknown submission outcome cannot be retried and can be reconciled", async () => {
  const context = setup();
  const job = await context.receive();
  mockMcLeod();
  globalThis.fetch = mock(async () => {
    throw new Error("Connection lost");
  }) as unknown as typeof fetch;
  const result = await context.review(job.id);
  expect(result.status).toBe("submissionUnknown");
  await expect(context.review(job.id)).rejects.toThrow("Cannot review");
  await expect(
    FreightOperator.refreshOrder
      .ctx({ state: context.state })
      .run({ id: job.id })
  ).rejects.toThrow("Do not resubmit");
  const remote = mockMcLeod({
    requestId: "verified-request",
    orderReferenceNumbers: { bol: "BOL-1042" },
    status: { action: "Accepted", orderId: "0261573" },
  });
  const reconciled = await FreightOperator.refreshOrder
    .ctx({ state: context.state })
    .run({
      id: job.id,
      requestId: "verified-request",
      reviewer: "dispatcher",
      note: "Matched BOL and correlation ID in McLeod",
    });
  expect(reconciled.status).toBe("orderCreated");
  expect(remote.mock.calls[0]![1]!.method).toBeUndefined();
});

test("missing configuration leaves a load awaiting approval", async () => {
  const context = setup();
  const job = await context.receive();
  delete process.env.MCLEOD_API_KEY;
  await expect(context.review(job.id)).rejects.toThrow("MCLEOD_");
  expect(context.state.jobs[0]!.status).toBe("awaitingApproval");
});

test("ambiguous, declined, and accepted-without-ID responses never claim order creation", async () => {
  for (const response of [
    { requestId: "request-42", status: { action: "Accepted" } },
    {
      requestId: "request-42",
      status: { action: "Declined", reason: "Customer mismatch" },
    },
    { status: { orderId: "0261573" } },
  ]) {
    const context = setup();
    const job = await context.receive();
    mockMcLeod(response);
    const result = await context.review(job.id);
    expect(result.status).toBe(
      response.requestId
        ? response.status.action === "Declined"
          ? "orderDeclined"
          : "awaitingOrder"
        : "submissionUnknown"
    );
    expect(result.orderId).toBe("");
  }
});

test("reconciliation rejects a different load's BOL", async () => {
  const context = setup();
  const job = await context.receive();
  mockMcLeod({});
  await context.review(job.id);
  mockMcLeod({
    requestId: "wrong-request",
    orderReferenceNumbers: { bol: "OTHER-BOL" },
    status: { orderId: "0261573" },
  });
  await expect(
    FreightOperator.refreshOrder.ctx({ state: context.state }).run({
      id: job.id,
      requestId: "wrong-request",
      reviewer: "dispatcher",
      note: "Attempted reconciliation",
    })
  ).rejects.toThrow("does not match");
  expect(context.state.jobs[0]!.status).toBe("submissionUnknown");
});

test("failed extraction is retained and retrying intake can recover", async () => {
  const context = setup();
  context.extractLoad.mockRejectedValueOnce(new Error("OpenAI unavailable"));
  expect((await context.receive()).status).toBe("extractionFailed");
  expect((await context.receive()).status).toBe("awaitingApproval");
  expect(context.state.jobs).toHaveLength(1);
});

test("rejects changed content under an existing source ID", async () => {
  const context = setup();
  await context.receive();
  await expect(
    FreightOperator.receiveLoad
      .ctx({ state: context.state, actions: context.actions })
      .run({
        sourceId: "message-1042",
        customerId: "1CHC",
        emailText: "Different document",
      })
  ).rejects.toThrow("different content");
});

test("validates stop ordering, timezone offsets, and temperature ranges", () => {
  const load = sampleLoad();
  load.stops[1]!.arrivalEarly = "2026-10-11T09:00:00-04:00";
  expect(validateLoad(load).join(" ")).toContain("out of sequence");
  load.stops[0]!.arrivalEarly = "2026-10-12T08:00:00";
  load.trailerType = "R";
  expect(validateLoad(load).join(" ")).toContain("explicit UTC offsets");
  expect(validateLoad(load).join(" ")).toContain("temperature range");
  expect(() => mapOrderRequest(load)).toThrow("Load is not ready");
});

test("persists the approval and submission marker before the network write", async () => {
  const { actions } = setup();
  const job = await FreightOperator.receiveLoad.ctx({ actions }).run({
    sourceId: "persistent-email",
    customerId: "1CHC",
    emailText: "Persistent test source",
  });
  mockMcLeod();
  let persistedStatus = "";
  let persistedApproval = false;
  globalThis.fetch = mock(async () => {
    const state = JSON.parse(
      await readFile(join(directory, "state", "FreightOperator.json"), "utf8")
    );
    persistedStatus = state.jobs[0].status;
    persistedApproval = JSON.parse(state.jobs[0].auditJson).some(
      (entry: { event: string }) => entry.event === "loadApproved"
    );
    return Response.json({
      requestId: "persisted-request",
      status: { action: "Accepted", orderId: "0261573" },
    });
  }) as unknown as typeof fetch;
  const result = await FreightOperator.reviewLoad({
    id: job.id,
    revision: job.revision,
    reviewer: "dispatcher",
    decision: "approve",
    note: "Reviewed persistent draft",
  });
  expect(persistedStatus).toBe("submitting");
  expect(persistedApproval).toBe(true);
  expect(result.status).toBe("orderCreated");
  const finalState = JSON.parse(
    await readFile(join(directory, "state", "FreightOperator.json"), "utf8")
  );
  expect(finalState.jobs[0].orderId).toBe("0261573");
});
