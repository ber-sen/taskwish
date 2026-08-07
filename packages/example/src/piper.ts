import { Actor, Step } from "taskwish";

const { piper } = Actor("Piper");

export const { count } = piper()
  .on("Command", "count")

  .input({ total: "number" })

  .run(
    Step("count", async function* () {
      for (let count = 1; count <= this.input.total; count++) {
        yield count;
        await Bun.sleep(100);
      }
    }),

    Step(["|>", "double"], async function* (source) {
      for await (const chunk of source) {
        yield `${chunk * 2}\n`;
      }
    }),
  );

export const { Piper } = piper().service({ public: [count] });
