import { mkdir } from "node:fs/promises";

import { morph } from "@taskwish/bare-metal";

const input = new URL("./two-steps.ts", import.meta.url);
const output = new URL("./bare-metal/two-steps.ts", import.meta.url);

await mkdir(new URL("./bare-metal", import.meta.url), { recursive: true });
await Bun.write(
  output,
  morph(await Bun.file(input).text(), {
    filePath: input.pathname,
  }),
);

console.log(`Wrote ${output.pathname}`);
