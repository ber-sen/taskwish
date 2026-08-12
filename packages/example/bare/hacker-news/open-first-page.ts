import { Trace, consume, mergeScope, type PartialScope } from "@taskwish/wire";

import { Browser } from "../browser";

export const openFirstPage = Object.assign(
  async function openFirstPage() {
    return openFirstPageCtx().run();
  },
  {
    ...openFirstPageCtx(),
    ctx: openFirstPageCtx,
  },
);

function openFirstPageCtx(scope: PartialScope<{ actions: { browser: { browse: typeof Browser.browse; }; } }> = {}) {
  const mergedScope = mergeScope({ actions: { browser: { browse: Browser.browse } } }, scope);

  async function run() {
    return consume(stream());
  }

  async function* stream() {
    const input = undefined;

    yield new Trace("HackerNews::openFirstPage", { input });

    const page = await mergedScope.actions.browser.browse({
      url: "https://news.ycombinator.com",
    });

    yield new Trace("HackerNews::openFirstPage.page", { result: page });

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

    yield new Trace("HackerNews::openFirstPage.openFirstPage", { result: openFirstPage });

    yield new Trace("HackerNews::openFirstPage", { result: openFirstPage });

    return openFirstPage;
  }

  return { run, stream };
}