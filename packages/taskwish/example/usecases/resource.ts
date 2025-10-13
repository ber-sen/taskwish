import { DestroyResult, Resource } from "../../src";

const S3Bucket = Resource("S3Bucket", (params: { name: string }, state) => {
  if (state === "up") {
    return { fileCreated: true };
  }

  return DestroyResult({ fileDeleted: true });
});

const a = S3Bucket({ name: "asdad" })
