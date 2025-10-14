import { Resource } from "../../src";

const S3Bucket = Resource("S3Bucket", (params: { name: string }, state) => {
  if (state === "up") {
    console.log("up");
  }

  return "lorem ipsum";
});

const a = S3Bucket({ name: "asdad" });
