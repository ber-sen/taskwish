import { Resource } from "../../src";

const S3Bucket = Resource(
  "S3Bucket",
  (params: { bucketName: string }, state) => {
    if (state === "up") {
      console.log("up");
    }

    return "lorem ipsum";
  }
);

const a = S3Bucket("My Bucket", { bucketName: "asdad" });
DedicatedWorkerGlobalScope
