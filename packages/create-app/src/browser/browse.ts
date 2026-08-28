import { access, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { chromium, type BrowserContext } from "playwright-core";
import { Step } from "taskwish";

import { actor } from "./browser";

let browserContext: BrowserContext | null = null;

async function getBrowserContext() {
  const browserProfileDir =
    process.env.TASKWISH_BROWSER_PROFILE ??
    join(homedir(), ".taskwish", "browser");

  const browserChannel = process.env.TASKWISH_BROWSER_CHANNEL ?? "chrome";

  if (!browserContext) {
    try {
      await access(browserProfileDir);
    } catch {
      await mkdir(browserProfileDir, { recursive: true });
    }

    browserContext = await chromium.launchPersistentContext(browserProfileDir, {
      channel: browserChannel,
      headless: false,
      ignoreDefaultArgs: ["--no-sandbox"],
      viewport: null,
    });
  }

  return browserContext;
}

export async function closeBrowserContext() {
  if (!browserContext) return { closed: false };

  await browserContext.close();
  browserContext = null;

  return { closed: true };
}

export const { browse } = actor()
  .on("Command", "browse")

  .input({ url: "string" })

  .run(
    Step("openPage", async function () {
      const browserContext = await getBrowserContext();
      const page = await browserContext.newPage();

      await page.goto(this.input.url, { waitUntil: "domcontentloaded" });

      return page;
    })
  );
