import { Step } from "taskwish";

import { browser } from "./browser";
import { closeBrowserContext } from "./browse";

export const { close } = browser()
  .on("Command", "close")

  .run(
    Step("closeBrowser", async function () {
      return closeBrowserContext();
    }),
  );
