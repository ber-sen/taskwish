import { Wire, createScope } from "@taskwish/wire";

import { Browser } from "../browser";

interface OpenFirstPageAction {
  (): Promise<{ title: string; url: string; }>;
  run(): Promise<{ title: string; url: string; }>;
  stream(): Promise<{ title: string; url: string; }>;
  ctx: typeof openFirstPageCtx;
}

export const openFirstPage: OpenFirstPageAction = Object.assign(
  async function openFirstPage() {
    return openFirstPageCtx().run();
  },
  {
    run: openFirstPageCtx().run,
    stream: openFirstPageCtx().stream,
    ctx: openFirstPageCtx,
  },
);

function openFirstPageCtx(ctx = {}) {
  const wire = new Wire();
  const initialScope = { wire, actions: { browser: { browse: Browser.browse } } };
  const scope: typeof initialScope = createScope(initialScope, ctx);

  async function run() {
    return stream();
  }

  async function stream() {
    const input = undefined;

    scope.wire.trace("HackerNews::openFirstPage", { input });

    const page = await scope.actions.browser.browse({
      url: "https://news.ycombinator.com",
    });

    scope.wire.trace("HackerNews::openFirstPage.page", { result: page });

    let openFirstPage: { title: string; url: string; };
    {
      const firstStory = page.locator(".athing .titleline > a").first();
      const beforeUrl = page.url();

      await firstStory.waitFor({ state: "visible" });

      await Promise.all([
        page.waitForURL((url: URL) => url.href !== beforeUrl, {
          waitUntil: "domcontentloaded",
        }),
        firstStory.click(),
      ]);

      const title = await page.title();
      const url = page.url();

      openFirstPage = {
        title,
        url,
      };
    }

    scope.wire.trace("HackerNews::openFirstPage.openFirstPage", { result: openFirstPage });

    scope.wire.trace("HackerNews::openFirstPage", { result: openFirstPage });

    return openFirstPage;
  }

  return { run, stream };
}