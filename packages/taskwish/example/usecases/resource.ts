import { Destroy } from "../../src/infra/destroy";
import { Resource } from "../../src/infra/resource";

const S3Bucket = Resource((params: { name: string }, state, ctx) => {
  if (state === "up") {
    return { fileCreated: true };
  }

  return Destroy({ fileDeleted: true });
});

const a = S3Bucket({ name: "asdad" }).down()
