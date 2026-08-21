import { Actor } from "taskwish";

const { actor } = Actor("Streamer");

export const { count } = actor()
  .on("Command", "count")

  .input({ total: "number" })

  .run(async function* () {
    for (let count = 1; count <= this.input.total; count++) {
      yield `${count}\n`;
      await Bun.sleep(100);
    }
  });

export const { Streamer } = actor().service({ count });
