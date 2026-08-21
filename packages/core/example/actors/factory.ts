import { Actor } from "taskwish";

const { actor } = Actor("Streamer").private({ total: "string" });

async function* countTo(total: number) {
  for (let count = 1; count <= total; count++) {
    yield `${count}\n`;
    await Bun.sleep(100);
  }
}

const { count } = actor()
  .on("Command", "count")

  .run(function () {
    return countTo(this.total);
  });

export const { Streamer } = actor().factory({
  public: { count },
});

// Streamer({ total: 5 }).count();
