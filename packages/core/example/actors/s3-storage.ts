import { Actor } from "../../src";
import { Storage } from "./storage";

const { s3Storage } = Actor("S3Storage");

export const { read } = s3Storage()
  .on(Storage.read)

  .run(function () {
    return `data:${this.input}`;
  });

export const { write } = s3Storage()
  .on(Storage.write)

  .run(function () {
    return `wrote:${this.input.key}`;
  });

export const { S3Storage } = s3Storage().service({ read, write });
