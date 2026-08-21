import { Step } from "taskwish";

import { actor } from "./browser";
import { closeBrowserContext } from "./browse";

export const { close } = actor()
  .on("Command", "close")

  .run(
    Step("closeBrowser", async function () {
      return closeBrowserContext();
    })
  );
