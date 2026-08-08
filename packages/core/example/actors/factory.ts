import { Actor } from "taskwish";

const { streamer } = Actor("Streamer").private({ total: "string" });

async function* countTo(total: number) {
  for (let count = 1; count <= total; count++) {
    yield `${count}\n`;
    await Bun.sleep(100);
  }
}

const { count } = streamer()
  .on("Command", "count")

  .run(function () {
    return countTo(this.total);
  });

export const { Streamer } = streamer().factory({
  public: { count },
});

// Streamer({ total: 5 }).count();
