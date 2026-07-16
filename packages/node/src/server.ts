import { createInterface } from "node:readline/promises";
import { createNodeRegistry } from "./registry";
import { json } from "./response";
import { createRoutes } from "./routes";
import type { NodeConfig, TaskwishNode } from "./types";
import { generateApiKey, isRecord } from "./utils";

const shutdownSignals: NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGHUP"];
const activeServers = new Set<Bun.Server<any>>();
let shutdownHandlersInstalled = false;
let shutdownInProgress = false;

const TASKWISH_BANNER = `
 ▗▄▄▄▖▗▞▀▜▌ ▄▄▄ █  ▄ ▄   ▄ ▄  ▄▄▄ ▐▌
   █  ▝▚▄▟▌▀▄▄  █▄▀  █ ▄ █ ▄ ▀▄▄  ▐▌
   █       ▄▄▄▀ █ ▀▄ █▄█▄█ █ ▄▄▄▀ ▐▛▀▚▖
   █            █  █       █      ▐▌ ▐▌`;

function exitCodeForSignal(signal: NodeJS.Signals): number {
  if (signal === "SIGINT") return 130;
  if (signal === "SIGTERM") return 143;
  if (signal === "SIGHUP") return 129;
  return 0;
}

async function stopActiveServers(): Promise<void> {
  const servers = Array.from(activeServers);
  activeServers.clear();

  await Promise.allSettled(servers.map((server) => server.stop(true)));
}

function installShutdownHandlers(): void {
  if (shutdownHandlersInstalled) return;
  shutdownHandlersInstalled = true;

  for (const signal of shutdownSignals) {
    process.once(signal, () => {
      if (shutdownInProgress) return;
      shutdownInProgress = true;

      void stopActiveServers().finally(() => {
        process.exit(exitCodeForSignal(signal));
      });
    });
  }
}

function registerServerForShutdown<T extends Bun.Server<any>>(server: T): T {
  installShutdownHandlers();
  activeServers.add(server);

  const stop = server.stop.bind(server);
  server.stop = async (closeActiveConnections?: boolean) => {
    activeServers.delete(server);
    return stop(closeActiveConnections);
  };

  return server;
}

function isPortUnavailableError(error: unknown): boolean {
  if (!isRecord(error)) return false;

  const code = error.code;
  if (code === "EADDRINUSE" || code === "EACCES") return true;

  const message = error.message;
  return (
    typeof message === "string" &&
    /address already in use|port.*in use|failed to start server/i.test(message)
  );
}

function serveWithRandomPortFallback(
  options: Parameters<typeof Bun.serve>[0],
): Bun.Server<any> {
  try {
    return Bun.serve(options);
  } catch (error) {
    if (!isPortUnavailableError(error)) throw error;
    return Bun.serve({ ...options, port: 0 } as Parameters<
      typeof Bun.serve
    >[0]);
  }
}

function printStartupMessage(
  server: Bun.Server<any>,
  name: string,
  apiKey: string,
): void {
  console.log(`${TASKWISH_BANNER}

${name} running on ${server.url.origin}
API key: ${apiKey}`);
}

function isInteractiveTerminal(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

async function shouldOpenBrowser(
  openBrowser: NodeConfig["openBrowser"],
): Promise<boolean> {
  if (openBrowser === true) return true;
  if (openBrowser === false) return false;
  if (!isInteractiveTerminal()) return false;

  const prompt = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await prompt.question("Open Command Center in browser? (Y/n) ");
    return !/^(n|no)$/i.test(answer.trim());
  } finally {
    prompt.close();
  }
}

function browserOpenCommand(url: string): string[] {
  if (process.platform === "darwin") return ["open", url];
  if (process.platform === "win32") return ["cmd", "/c", "start", "", url];
  return ["xdg-open", url];
}

async function openBrowser(url: string): Promise<void> {
  const command = browserOpenCommand(url);
  const subprocess = Bun.spawn(command, {
    stdout: "ignore",
    stderr: "ignore",
  });
  await subprocess.exited;
}

async function maybeOpenBrowser(
  url: string,
  openBrowserConfig: NodeConfig["openBrowser"],
): Promise<void> {
  if (await shouldOpenBrowser(openBrowserConfig ?? "ask")) {
    await openBrowser(url);
  }
}

function handleOpenBrowserError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`Could not open browser: ${message}`);
}

export async function Node(
  name: string,
  config: NodeConfig = {},
): Promise<TaskwishNode> {
  const apiKey = config.apiKey ?? generateApiKey();
  const registry = createNodeRegistry(config.workspace);
  const routes = await createRoutes(registry, {
    prefix: config.prefix,
    apiKey,
    nodeName: name,
  });

  const server = registerServerForShutdown(
    serveWithRandomPortFallback({
      port: config.port ?? 0,
      hostname: config.hostname,
      development: config.development,
      routes,
      fetch() {
        return json(404, { error: "Not Found" });
      },
    } as Parameters<typeof Bun.serve>[0]),
  );

  printStartupMessage(server, name, apiKey);
  void maybeOpenBrowser(server.url.origin, config.openBrowser).catch(
    handleOpenBrowserError,
  );

  return Object.assign(server, { name, apiKey, routes }) as TaskwishNode;
}
