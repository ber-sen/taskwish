import { Trace, consume } from "@taskwish/wire";

import { closeBrowserContext } from "./browse";

export const close = Object.assign(
  async function close() {
    return closeCtx().run();
  },
  {
    ...closeCtx(),
    ctx: closeCtx,
  },
);

function closeCtx(scope: {} = {}) {

  async function run() {
    return consume(stream());
  }

  async function* stream() {
    const input = undefined;

    yield new Trace("Browser::close", { input });

    const closeBrowser = await closeBrowserContext();

    yield new Trace("Browser::close.closeBrowser", { result: closeBrowser });

    yield new Trace("Browser::close", { result: closeBrowser });

    return closeBrowser;
  }

  return { run, stream };
}