import { Actor } from "taskwish";

const { Streamer } = Actor("Streamer");

async function* countTo(total: number) {
  for (let count = 1; count <= total; count++) {
    yield `${count}\n`;
    await Bun.sleep(100);
  }
}

export const { count } = Streamer()
  .on("Command", "count")

  .input({ total: "number" })

  .run(function () {
    return countTo(this.input.total);
  });
