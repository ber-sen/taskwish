import { Input, Step } from "taskwish";

import { parseLoad, validateLoad } from "../shared/load";
import { audit, fingerprint, viewJob, withLoadLock } from "../shared/records";
import { actor } from "./freight-operator";

export const { receiveLoad } = actor()
  .on("Command", "receiveLoad")

  .input({
    sourceId: "string",
    customerId: "string",
    "emailText?": "string",
    "attachments?": Input.List(
      Input.File({ maxBytes: 10_000_000 }),
    ),
  })

  .run(
    Step("checkIntake", function () {
      const sourceId = this.input.sourceId.trim();
      const customerId = this.input.customerId.trim();
      if (!sourceId || !customerId)
        throw new Error(
          "sourceId and the verified McLeod customerId are required."
        );
      if (
        !this.input.emailText?.trim() &&
        !(this.input.attachments?.length ?? 0)
      )
        throw new Error("Provide emailText or at least one document attachment.");
      return {
        sourceId,
        customerId,
        sourceHash: fingerprint({
          emailText: this.input.emailText ?? "",
          attachments: this.input.attachments ?? [],
        }),
      };
    }),

    Step("extractAndValidate", async function () {
      const intake = this.checkIntake;
      return withLoadLock(
        `intake:${intake.customerId}:${intake.sourceId}`,
        async () => {
          let job = this.state.jobs.find(
            (item) =>
              item.sourceId === intake.sourceId &&
              item.customerId === intake.customerId
          );
          if (job) {
            if (job.sourceHash !== intake.sourceHash)
              throw new Error(
                "This sourceId already has different content. Use a new sourceId for a new document."
              );
            if (!["extractionFailed", "extracting"].includes(job.status))
              return viewJob(job);
          } else {
            const now = new Date().toISOString();
            this.state.jobs.push({
              ...intake,
              status: "extracting",
              revision: 0,
              markdown: "",
              loadJson: "",
              issuesJson: "[]",
              auditJson: "[]",
              requestId: "",
              orderId: "",
              error: "",
              createdAt: now,
              updatedAt: now,
            });
            job = this.state.jobs.at(-1)!;
          }
          job.status = "extracting";
          job.error = "";
          audit(job, "intakeReceived");
          try {
            const sources: { markdown: string }[] = [];
            if (this.input.emailText?.trim())
              sources.push(
                await this.actions.emails.readEmail({
                  body: this.input.emailText,
                })
              );
            if (this.input.attachments?.length)
              sources.push(
                await this.actions.documents.readDocuments({
                  attachments: this.input.attachments,
                })
              );
            job.markdown = sources
              .map((source) => source.markdown)
              .join("\n\n---\n\n");
            const load = parseLoad(
              await this.actions.loadExtractor.extractLoad({
                markdown: job.markdown,
              })
            );
            const issues = validateLoad(load);
            job.loadJson = JSON.stringify(load);
            job.issuesJson = JSON.stringify(issues);
            job.revision += 1;
            job.status = issues.length ? "needsCorrection" : "awaitingApproval";
            audit(job, job.status);
          } catch (error) {
            job.status = "extractionFailed";
            job.error =
              error instanceof Error ? error.message : "Extraction failed.";
            audit(job, "extractionFailed", "system", job.error);
          }
          return viewJob(job);
        }
      );
    })
  )

  .meta({
    description:
      "Receive email/document content, extract a load, validate it, and stop for human review",
    input: {
      sourceId: {
        description:
          "Stable email Message-ID or document ID; repeated delivery returns the existing load",
        example: "email-load-1042",
      },
      customerId: {
        description:
          "Verified McLeod bill-to/master or cross-reference ID supplied by intake configuration",
        example: "1CHC",
      },
      emailText: { description: "Decoded plain-text email body" },
      attachments: {
        description: "Upload documents supported by Anydoc, up to 10 MB total",
      },
    },
  });
