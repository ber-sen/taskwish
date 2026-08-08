import { Actor } from "taskwish";

const { streamer } = Actor("Streamer");

async function* countTo(total: number) {
  for (let count = 1; count <= total; count++) {
    yield `${count}\n`;
    await Bun.sleep(100);
  }
}

export const { count } = streamer()
  .on("Command", "count")

  .input({ total: "number" })

  .run(function () {
    return countTo(this.input.total);
  });

export const { Streamer } = streamer().service({ count });
