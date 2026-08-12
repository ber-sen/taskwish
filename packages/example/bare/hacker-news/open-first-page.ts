import { Trace, consume } from "@taskwish/wire";

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

function openFirstPageCtx(scope: { actions: { browser: { browse: typeof Browser.browse; }; } } = { actions: { browser: { browse: Browser.browse } } }) {

  async function run() {
    return consume(stream());
  }

  async function* stream() {
    const input = undefined;

    yield new Trace("HackerNews::openFirstPage", { input });

    const page = await scope.actions.browser.browse({
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

      openFirstPage = await ({
        title,
        url,
      });
    }

    yield new Trace("HackerNews::openFirstPage.openFirstPage", { result: openFirstPage });

    yield new Trace("HackerNews::openFirstPage", { result: openFirstPage });

    return openFirstPage;
  }

  return { run, stream };
}