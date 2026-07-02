import { Actor, Step } from "taskwish";

export const { HackerNews } = Actor("HackerNews").use(import("./browser"));

export const { openFirstPage } = HackerNews()
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
        this.page.waitForURL((url) => url.href !== beforeUrl, {
          waitUntil: "domcontentloaded",
        }),
        firstStory.click(),
      ]);

      return {
        title: await this.page.title(),
        url: this.page.url(),
      };
    }),
  );
