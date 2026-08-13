import { Wire, createScope } from "@taskwish/wire";

import { access, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { chromium, type BrowserContext } from "playwright-core";
let browserContext: BrowserContext | null = null;

async function getBrowserContext() {
  const browserProfileDir =
    process.env.TASKWISH_BROWSER_PROFILE ?? join(homedir(), ".taskwish", "browser");

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

interface BrowseAction {
  (input: { url: string; }): Promise<import("/Users/sparta/.projects/taskwish/node_modules/playwright-core/index").Page>;
  run(input: { url: string; }): Promise<import("/Users/sparta/.projects/taskwish/node_modules/playwright-core/index").Page>;
  stream(input: { url: string; }): Promise<import("/Users/sparta/.projects/taskwish/node_modules/playwright-core/index").Page>;
  ctx: typeof browseCtx;
}

export const browse: BrowseAction = Object.assign(
  async function browse(input: { url: string; }) {
    return browseCtx().run(input);
  },
  {
    run: browseCtx().run,
    stream: browseCtx().stream,
    ctx: browseCtx,
  },
);

function browseCtx(ctx = {}) {
  const wire = new Wire();
  const initialScope = { wire };
  const scope: typeof initialScope = createScope(initialScope, ctx);

  async function run(input: { url: string; }) {
    return stream(input);
  }

  async function stream(input: { url: string; }) {

    scope.wire.trace("Browser::browse", { input });

    let openPage: import("/Users/sparta/.projects/taskwish/node_modules/playwright-core/index").Page;
    {
      const browserContext = await getBrowserContext();
      const page = await browserContext.newPage();

      await page.goto(input.url, { waitUntil: "domcontentloaded" });

      openPage = await page;
    }

    scope.wire.trace("Browser::browse.openPage", { result: openPage });

    scope.wire.trace("Browser::browse", { result: openPage });

    return openPage;
  }

  return { run, stream };
}