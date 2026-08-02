import { createNodeRegistry } from "./registry";
import { json } from "./response";
import { normalizePrefix } from "./routes";
import { createRoutes } from "./routes";
import type { NodeAppReadyContext, NodeConfig, TaskWishNode } from "./types";
import { generateApiKey, isRecord } from "./utils";

const shutdownSignals: NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGHUP"];
const activeServers = new Set<Bun.Server<any>>();
let shutdownHandlersInstalled = false;
let shutdownInProgress = false;

const TASKWISH_BANNER = `
                ███            \x1b[38;2;179;179;179m███\x1b[0m
              ███            \x1b[38;2;179;179;179m███\x1b[0m
    ███     ███    \x1b[38;2;179;179;179m███\x1b[0m     \x1b[38;2;179;179;179m███\x1b[0m
      ███ ███        \x1b[38;2;179;179;179m███\x1b[0m \x1b[38;2;179;179;179m███\x1b[0m
        ███            \x1b[38;2;179;179;179m███\x1b[0m`;

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

async function notifyAppsReady(
  apps: NodeConfig["apps"],
  context: NodeAppReadyContext,
): Promise<void> {
  await Promise.allSettled(apps?.map((app) => app.ready?.(context)) ?? []);
}

export async function Node(
  name: string,
  config: NodeConfig = {},
): Promise<TaskWishNode> {
  const apiKey = config.apiKey ?? generateApiKey();
  const registry = createNodeRegistry(config.workspace);
  const services = await registry;
  const routePrefix = normalizePrefix(config.prefix ?? "/tw");
  const routes = await createRoutes(registry, {
    prefix: routePrefix,
    apiKey,
    nodeName: name,
    apps: config.apps,
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
  void notifyAppsReady(config.apps, {
    registry: services,
    nodeName: name,
    apiKey,
    prefix: routePrefix,
    server,
  });

  return Object.assign(server, { name, apiKey, routes }) as TaskWishNode;
}
