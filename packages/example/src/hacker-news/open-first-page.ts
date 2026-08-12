import { Step } from "taskwish";

import { hackerNews } from "./hacker-news";

export const { openFirstPage } = hackerNews()
  .on("Command", "openFirstPage")

  .run(
    Step("page", function () {
      return this.actions.browser.browse({
        url: "https://news.ycombinator.com",
      });
    }),

    Step("openFirstPage", async function () {
      const firstStory = this.page.locator(".athing .titleline > a").first();
      const beforeUrl = this.page.url();

      await firstStory.waitFor({ state: "visible" });

      await Promise.all([
        this.page.waitForURL((url: URL) => url.href !== beforeUrl, {
          waitUntil: "domcontentloaded",
        }),
        firstStory.click(),
      ]);

      const title = await this.page.title();
      const url = this.page.url();

      return {
        title,
        url,
      };
    }),
  );
