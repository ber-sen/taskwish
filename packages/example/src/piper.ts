import { Actor, Step } from "taskwish";

const { Piper } = Actor("Piper");

export const { count } = Piper()
  .on("Command", "count")

  .input({ total: "number" })

  .run(
    Step("count", async function* () {
      for (let count = 1; count <= this.input.total; count++) {
        yield count;
        await Bun.sleep(100);
      }
    }),

    Step(["count", "|>", "double"], async function* (source) {
      for await (const chunk of source) {
        yield chunk * 2;
      }
    }),
  );
