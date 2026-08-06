import { Actor } from "../../src";
import { Storage } from "./storage";

const { S3Storage } = Actor("S3Storage");

export const { read } = S3Storage()
  .on(Storage.read)

  .run(function () {
    return `data:${this.input}`;
  });

export const { write } = S3Storage()
  .on(Storage.write)

  .run(function () {
    return `wrote:${this.input.key}`;
  });
