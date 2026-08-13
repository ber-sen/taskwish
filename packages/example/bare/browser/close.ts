import { Wire, createScope } from "@taskwish/wire";

import { closeBrowserContext } from "./browse";

interface CloseAction {
  (): Promise<{ closed: boolean; }>;
  run(): Promise<{ closed: boolean; }>;
  stream(): Promise<{ closed: boolean; }>;
  ctx: typeof closeCtx;
}

export const close: CloseAction = Object.assign(
  async function close() {
    return closeCtx().run();
  },
  {
    run: closeCtx().run,
    stream: closeCtx().stream,
    ctx: closeCtx,
  },
);

function closeCtx(ctx = {}) {
  const wire = new Wire();
  const initialScope = { wire };
  const scope: typeof initialScope = createScope(initialScope, ctx);

  async function run() {
    return stream();
  }

  async function stream() {
    const input = undefined;

    scope.wire.trace("Browser::close", { input });

    const closeBrowser = await closeBrowserContext();

    scope.wire.trace("Browser::close.closeBrowser", { result: closeBrowser });

    scope.wire.trace("Browser::close", { result: closeBrowser });

    return closeBrowser;
  }

  return { run, stream };
}