import { Step } from "taskwish";

import { loadDefinition, parseLoad, validateLoad } from "../shared/load";
import {
  audit,
  findJob,
  requireRevision,
  viewJob,
  withLoadLock,
} from "../shared/records";
import { actor } from "./freight-operator";

export const { reviseLoad } = actor()
  .on("Command", "reviseLoad")

  .input({
    id: "string",
    revision: "number",
    reviewer: "string",
    note: "string",
    load: loadDefinition,
  })

  .run(
    Step("reviseAndValidate", async function () {
      return withLoadLock(this.input.id, async () => {
        const job = findJob(this.state.jobs, this.input.id);
        requireRevision(job, this.input.revision);
        if (
          !["needsCorrection", "awaitingApproval", "rejected"].includes(
            job.status
          )
        )
          throw new Error("Only unsubmitted loads can be revised.");
        if (!this.input.reviewer.trim() || !this.input.note.trim())
          throw new Error("A reviewer and correction note are required.");
        const load = parseLoad(this.input.load);
        const issues = validateLoad(load);
        job.loadJson = JSON.stringify(load);
        job.issuesJson = JSON.stringify(issues);
        job.revision += 1;
        job.status = issues.length ? "needsCorrection" : "awaitingApproval";
        job.error = "";
        audit(
          job,
          "loadRevised",
          this.input.reviewer.trim(),
          this.input.note.trim()
        );
        return viewJob(job);
      });
    })
  )

  .meta({
    description:
      "Correct a complete load draft and revalidate it; a new revision requires fresh approval",
    input: {
      load: {
        description:
          "Complete corrected load from listLoads; resolve source concerns explicitly",
      },
      note: {
        description:
          "Explain corrections and how source concerns were resolved",
      },
    },
  });
