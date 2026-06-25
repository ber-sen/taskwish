import { Actor } from "../../src";

const { S3Storage } = Actor("S3Storage");

export const { read } = S3Storage(import("./storage"))
  .on("::read")

  .run(function () {
    return `data:${this.input}`;
  });

export const { write } = S3Storage(import("./storage"))
  .on("::write")

  .run(function () {
    return `wrote:${this.input.key}`;
  });
