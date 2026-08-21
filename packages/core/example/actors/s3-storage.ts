import { Actor } from "../../src";
import { Storage } from "./storage";

const { actor } = Actor("S3Storage");

export const { read } = actor()
  .on(Storage.read)

  .run(function () {
    return `data:${this.input}`;
  });

export const { write } = actor()
  .on(Storage.write)

  .run(function () {
    return `wrote:${this.input.key}`;
  });

export const { S3Storage } = actor().service({ read, write });
