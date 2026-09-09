import { Step } from "taskwish";

import { viewJob } from "../shared/records";
import { actor } from "./freight-operator";

export const { listLoads } = actor()
  .on("Command", "listLoads")

  .input({ "status?": "string" })

  .run(
    Step("listLoads", function () {
      return this.state.jobs
        .filter((job) => !this.input.status || job.status === this.input.status)
        .map(viewJob);
    })
  )

  .meta({
    description:
      "Review loads, source Markdown, validation issues, revisions, and audit history",
  });
