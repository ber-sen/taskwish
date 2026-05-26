import { buildScope, runAction, tapWith, type ActionFactory } from "./action";
import { Event } from "./event";
import {
  CamelCase,
  PascalCase,
  InferSchema,
  ValidateSchema,
  Pretty,
  ExtractActionName,
  ActionService,
  ActionMethod,
  GroupActions,
  ActionsFromPlugin,
  AddActionsToCtx,
} from "./helpers";
import { TW } from "./core";
import { dispatch, type ConsoleLike, type LoggerConfig } from "./use";
import { type Steps } from "./steps/steps";
import { ResultKind } from "./steps/hkt";

type BaseScope<Ctx> = Ctx extends Record<any, any> ? Ctx["scope"] : {};

type EventKeys<Scope> = {
  [K in keyof Scope]: Scope[K] extends TW.EventKind<any, any> ? K : never;
}[keyof Scope] &
  string;

type ExtractEventInput<Scope, EventName extends string> =
  Scope extends Record<EventName, TW.EventKind<string, infer D>> ? D : never;

type ExtractEventExtraScope<Scope, EventName extends string> =
  Scope extends Record<EventName, TW.EventKind<string, any, infer S>> ? S : {};

type ScheduleInput = { expression: string; at: Date };

export type HttpEvent = {
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
};

type ValidateHttpSchema<Schema> = {
  [K in keyof Schema]: K extends "params" | "query" | "body" | "headers"
    ? ValidateSchema<Schema[K]>
    : `Unexpected key "${K & string}", expected "params" | "query" | "body" | "headers"`;
};

type FlatInput<Schema> = Pretty<
  (Schema extends { params: infer P } ? InferSchema<P> : {}) &
    (Schema extends { query: infer Q } ? InferSchema<Q> : {}) &
    (Schema extends { body: infer B } ? InferSchema<B> : {})
>;

interface HttpBody<
  Method extends string,
  Scope extends Record<any, any>,
  Service extends string = string,
> {
  use(): this;
  run<
    H extends (
      this: TW.Scope<Pretty<{ input: Request; request: Request } & Scope>>,
    ) => any,
  >(
    handler: H,
  ): {
    [key in Method]: TW.Action<
      `${Service}.${Method}`,
      (input: Request) => Promise<Awaited<ReturnType<H>>>,
      null
    >;
  };
}

type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> } & {};

interface CommandBody<
  CmdName extends string,
  FlatIn,
  Method extends string,
  Path extends string,
  Schema,
  Scope extends Record<any, any>,
  Service extends string,
> {
  use(): this;
  run<
    const H extends (this: TW.Scope<Pretty<{ input: FlatIn } & Scope>>) => any,
  >(
    handler: H,
    ...rest: unknown[]
  ): {
    [key in CmdName]: TW.Action<
      `${Service}.${CmdName}`,
      (input: FlatIn) => Promise<Awaited<ReturnType<H>>>,
      { route: [Method, Path, DeepWriteable<Schema>] }
    >;
  };
}

type BuiltInEventScope = {
  NewEmail: TW.EventKind<
    "NewEmail",
    { from: string; to: string; subject: string; body: string },
    { thread: { from: string; to: string; subject: string; body: string } }
  >;
  NewMessage: TW.EventKind<
    "NewMessage",
    { sender: { name: string }; content: string; channel: string },
    { thread: { sender: { name: string }; content: string; channel: string } }
  >;
  NewMention: TW.EventKind<
    "NewMention",
    { sender: { name: string }; text: string; channel: string }
  >;
};

const builtInEventScope: Record<string, unknown> = {
  ...Event(
    "NewEmail",
    { from: "string", to: "string", subject: "string", body: "string" },
    (input) => ({ thread: input }),
  ),
  ...Event(
    "NewMessage",
    { sender: { name: "string" }, content: "string", channel: "string" },
    (input) => ({ thread: input }),
  ),
  ...Event("NewMention", {
    sender: { name: "string" },
    text: "string",
    channel: "string",
  }),
};

export interface Behavior<Ctx extends Record<any, any>> {
  use(config: LoggerConfig): this;

  on<Name extends string>(
    behavior: "Command",
    name: CamelCase<Name>,
  ): ActionFactory<
    Name,
    { name: Name; service: Ctx["name"]; scope: BaseScope<Ctx> }
  >;

  on(
    behavior: "Schedule",
    expression?: string,
  ): ActionFactory<
    "onSchedule",
    {
      name: "onSchedule";
      service: Ctx["name"];
      scope: { input: ScheduleInput } & BaseScope<Ctx>;
    }
  >;

  on<
    const Method extends "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    const Path extends string,
    const Schema,
    I = Pretty<
      { path: string } & (Schema extends { params: infer P }
        ? { params: InferSchema<P> }
        : {}) &
        (Schema extends { query: infer Q } ? { query: InferSchema<Q> } : {}) &
        (Schema extends { body: infer B } ? { body: InferSchema<B> } : {})
    >,
  >(
    behavior: Method,
    path: Path,
    schema: ValidateHttpSchema<Schema>,
  ): {
    command<const CmdName extends string>(
      name: CmdName,
    ): CommandBody<
      CmdName,
      FlatInput<Schema>,
      Method,
      Path,
      Schema,
      BaseScope<Ctx>,
      Ctx["name"]
    >;
  };

  on<const Method extends "GET" | "POST" | "PUT" | "DELETE" | "PATCH">(
    behavior: Method,
    path: string,
  ): HttpBody<Method, BaseScope<Ctx>, Ctx["name"] & string>;

  on<const EventName extends EventKeys<BaseScope<Ctx>>>(
    behavior: EventName,
  ): ActionFactory<
    `on${EventName}`,
    {
      name: `on${EventName}`;
      service: Ctx["name"] & string;
      scope: {
        input: ExtractEventInput<BaseScope<Ctx>, EventName>;
      } & ExtractEventExtraScope<BaseScope<Ctx>, EventName> &
        BaseScope<Ctx>;
    }
  >;
}

/**
 * Used by `Steps<Ctx, DefResultKind>` — produces a named behavior definition
 * `{ [name]: () => Behavior<Last> }`.
 */
export interface DefResultKind extends ResultKind {
  type: this["ctx"] extends Record<any, any>
    ? "name" extends keyof this["ctx"]
      ? this["ctx"]["name"] extends string
        ? {
            [name in this["ctx"]["name"]]: () => Behavior<
              this["last"] & Record<any, any>
            >;
          }
        : never
      : never
    : never;
}

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "DELETE", "PATCH"]);

function matchPathParams(
  pattern: string,
  pathname: string,
): Record<string, string> {
  const keys: string[] = [];
  const regexStr = pattern.replace(/:([^/]+)/g, (_, key) => {
    keys.push(key);
    return "([^/]+)";
  });
  const match = pathname.match(new RegExp(`^${regexStr}(?:/.*)?$`));
  if (!match) return {};
  return Object.fromEntries(keys.map((k, i) => [k, match[i + 1]]));
}

type BehaviorMod = { args: unknown[]; scope: Record<string, unknown> };

function makeBehaviorMod(
  behavior: string,
  config?: string,
  schema?: unknown,
  initialScope?: Record<string, unknown>,
): (args: unknown[]) => BehaviorMod {
  if (behavior === "Schedule") {
    return (args) => ({
      args: [
        { expression: config, ...((args[0] as Record<string, unknown>) ?? {}) },
      ],
      scope: {},
    });
  }
  if (HTTP_METHODS.has(behavior)) {
    if (schema) {
      return (args) => {
        const arg = args[0];
        let extracted: Record<string, unknown>;
        if (arg instanceof Request) {
          const url = new URL((arg as Request).url);
          extracted = {
            path: url.pathname,
            params: config ? matchPathParams(config, url.pathname) : {},
            query: Object.fromEntries(url.searchParams.entries()),
          };
        } else {
          extracted = (arg as Record<string, unknown>) ?? {};
        }
        return { args: [extracted], scope: { request: arg } };
      };
    }
    return (args) => ({
      args: [args[0]],
      scope: { request: args[0] },
    });
  }
  if (initialScope) {
    const eventKind = (initialScope as Record<string, any>)[behavior];
    if (eventKind?.scopeOf) {
      return (args) => ({
        args,
        scope: (
          eventKind.scopeOf as (input: unknown) => Record<string, unknown>
        )(args[0]),
      });
    }
  }
  return (args) => ({ args, scope: {} });
}

function toResponse(result: unknown): Response {
  if (result instanceof Response) return result;
  if (typeof result === "string")
    return new Response(result, { headers: { "Content-Type": "text/plain" } });
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
}

function flattenHttpInput(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  if (raw.params && typeof raw.params === "object")
    Object.assign(flat, raw.params);
  if (raw.query && typeof raw.query === "object")
    Object.assign(flat, raw.query);
  if (raw.body && typeof raw.body === "object") Object.assign(flat, raw.body);
  return flat;
}

function collectScope(steps: unknown[]): Record<string, unknown> {
  const scope: Record<string, unknown> = {};
  for (const step of steps) {
    if (step !== null && typeof step === "object") {
      for (const key of Object.keys(step as object)) {
        scope[key] = (step as Record<string, unknown>)[key];
      }
    }
  }
  return scope;
}

function createBehavior(
  actorName: string,
  initialScope: Record<string, unknown>,
): Behavior<any> {
  let logger: ConsoleLike = console;

  function tap<G extends AsyncGenerator<unknown, unknown>>(gen: G): G {
    return tapWith(gen, dispatch(logger)) as G;
  }

  const self = {
    use(config: LoggerConfig) {
      logger = config.target;
      return self;
    },
    on(behavior: string, config?: string, schema?: unknown) {
      let actionName: string;
      if (behavior === "Command") {
        actionName = config!;
      } else if (HTTP_METHODS.has(behavior)) {
        actionName = behavior;
      } else {
        actionName = `on${behavior}`;
      }

      const eventName = `${actorName}.${actionName}`;
      const mod = makeBehaviorMod(behavior, config, schema, initialScope);

      function createAction(inputMode: "first" | "args", handlers: unknown[]) {
        async function consume(...args: unknown[]) {
          const { args: modArgs, scope: behaviorScope } = mod(args);
          const extra = { ...initialScope, ...behaviorScope };
          const gen = tap(
            runAction(
              eventName,
              buildScope(inputMode, modArgs, extra),
              handlers,
            ),
          );
          let item = await gen.next();
          while (!item.done) item = await gen.next();
          return item.value;
        }

        function stream(...args: unknown[]) {
          const { args: modArgs, scope: behaviorScope } = mod(args);
          const extra = { ...initialScope, ...behaviorScope };
          return tap(
            runAction(
              eventName,
              buildScope(inputMode, modArgs, extra),
              handlers,
            ),
          );
        }

        return {
          [actionName]: Object.assign(consume, {
            [TW.Name]: eventName,
            stream,
          }),
        };
      }

      const makeBody = (inputMode: "first" | "args") => ({
        use() {
          return this;
        },
        run(...handlers: unknown[]) {
          return createAction(inputMode, handlers);
        },
      });

      const base = {
        sig() {
          return makeBody("args");
        },
        input(_schema?: unknown) {
          return makeBody("first");
        },
        use() {
          return this;
        },
        run(...handlers: unknown[]) {
          return createAction("first", handlers);
        },
      };

      if (HTTP_METHODS.has(behavior) && schema) {
        return {
          ...base,
          command(cmdName: string) {
            return {
              use() {
                return this;
              },
              run(...handlers: unknown[]) {
                const qualifiedCmdName = `${actorName}.${cmdName}`;

                function rawCmdStream(flatInput: unknown) {
                  return runAction(
                    qualifiedCmdName,
                    buildScope("first", [flatInput], { ...initialScope }),
                    handlers,
                  );
                }

                function cmdStream(flatInput: unknown) {
                  return tap(rawCmdStream(flatInput));
                }

                async function cmdConsume(flatInput: unknown) {
                  const gen = tap(rawCmdStream(flatInput));
                  let item = await gen.next();
                  while (!item.done) item = await gen.next();
                  return item.value;
                }

                async function* rawFetchStream(input: Request) {
                  const request = input;
                  const { args: modArgs } = mod([request]);
                  const rawInput = modArgs[0] as Record<string, unknown>;
                  yield { ">": eventName, input: rawInput };
                  const flatInput = flattenHttpInput(rawInput);
                  let result: unknown;
                  try {
                    const inner = rawCmdStream(flatInput);
                    let item = await inner.next();
                    while (!item.done) {
                      yield item.value;
                      item = await inner.next();
                    }
                    result = item.value;
                  } catch (error) {
                    yield { ">": eventName, error };
                    throw error;
                  }
                  yield { ">": eventName, result: toResponse(result) };
                }

                function fetchStream(input: Request) {
                  return tap(rawFetchStream(input));
                }

                async function fetchFn(input: Request) {
                  const gen = tap(rawFetchStream(input));
                  let last: any;
                  for await (const event of gen) last = event;
                  return last.result as Response;
                }

                return {
                  [cmdName]: Object.assign(cmdConsume, {
                    stream: cmdStream,
                    fetch: Object.assign(fetchFn, { stream: fetchStream }),
                  }),
                };
              },
            };
          },
        } as any;
      }

      return base as any;
    },
  };

  return self as unknown as Behavior<any>;
}


/**
 * The full return type of Actor(), including:
 *  - `def` / `[actorName]` — standard builder API
 *  - `use(plugin)` — inject action scope from an object or dynamic import
 *  - all `Behavior` methods (except `use`) so `.on()` can be called fluently
 *    directly on the builder without needing an explicit `[actorName]()` call
 */
type ActorBuilderResult<Name extends string, Ctx extends Record<any, any>> = {
  def: Steps<Ctx, DefResultKind>;
  use<const U>(plugin: U): ActorBuilderResult<Name, AddActionsToCtx<Ctx, U>>;
} & {
  [key in Name]: () => Behavior<Ctx>;
} & Omit<Behavior<Ctx>, "use">;

// ── Actor builder runtime ─────────────────────────────────────────────────────

function makeActorBuilder(
  actorName: string,
  actorScope: Record<string, unknown>,
): any {
  // Lazily-created behavior for fluid `.on()` calls directly on the builder.
  let _behavior: ReturnType<typeof createBehavior> | null = null;
  const getBehavior = () => {
    if (!_behavior)
      _behavior = createBehavior(actorName, {
        ...builtInEventScope,
        ...actorScope,
      });
    return _behavior;
  };

  return {
    def(...steps: unknown[]) {
      const initialScope = {
        ...builtInEventScope,
        ...actorScope,
        ...collectScope(steps),
      };
      return {
        [actorName]: () => createBehavior(actorName, initialScope),
      } as any;
    },

    use(plugin: unknown): any {
      // Single TW.Action passed directly — e.g. Actor("X").use(notify)
      if (typeof plugin === "function") {
        const fullName: unknown = (plugin as any)[TW.Name];
        if (typeof fullName === "string") {
          const existing =
            (actorScope.actions as Record<string, unknown> | undefined) ?? {};
          const dot = fullName.indexOf(".");
          let merged: Record<string, unknown>;
          if (dot === -1) {
            // Flat name → this.actions.notify
            merged = { ...existing, [fullName]: plugin };
          } else {
            // Dotted name → this.actions.notifier.notify
            const rawService = fullName.slice(0, dot);
            const service =
              rawService.charAt(0).toLowerCase() + rawService.slice(1);
            const method = fullName.slice(dot + 1);
            merged = {
              ...existing,
              [service]: {
                ...(existing[service] as Record<string, unknown> | undefined),
                [method]: plugin,
              },
            };
          }
          return makeActorBuilder(actorName, {
            ...actorScope,
            actions: merged,
          });
        }
        return makeActorBuilder(actorName, actorScope);
      }

      if (plugin !== null && typeof plugin === "object") {
        if ("then" in (plugin as object)) {
          // Dynamic import — action types flow in at compile time via
          // ActionsFromPlugin<U>; runtime injection is handled by the Package system.
          return makeActorBuilder(actorName, actorScope);
        }

        // Plain object — inject every TW.Action (tagged with [TW.Name]).
        // Dotted names ("Service.method") → nested; flat names → direct.
        // Non-action values are silently ignored.
        const incoming: Record<string, unknown> = {};
        for (const v of Object.values(plugin as Record<string, unknown>)) {
          if (typeof v !== "function") continue;
          const fullName: unknown = (v as any)[TW.Name];
          if (typeof fullName !== "string") continue;
          const dot = fullName.indexOf(".");
          if (dot === -1) {
            // Flat name → this.actions.notify
            incoming[fullName] = v;
          } else {
            // Dotted name → this.actions.notifier.notify
            const rawService = fullName.slice(0, dot);
            const service =
              rawService.charAt(0).toLowerCase() + rawService.slice(1);
            const method = fullName.slice(dot + 1);
            incoming[service] = {
              ...(incoming[service] as Record<string, unknown> | undefined),
              [method]: v,
            };
          }
        }

        if (Object.keys(incoming).length === 0)
          return makeActorBuilder(actorName, actorScope);

        const existing =
          (actorScope.actions as Record<string, unknown> | undefined) ?? {};
        const merged: Record<string, unknown> = { ...existing };
        for (const [key, value] of Object.entries(incoming)) {
          if (typeof value === "function") {
            merged[key] = value;
          } else {
            merged[key] = {
              ...(merged[key] as Record<string, unknown> | undefined),
              ...(value as Record<string, unknown>),
            };
          }
        }
        return makeActorBuilder(actorName, {
          ...actorScope,
          actions: merged,
        });
      }
      return makeActorBuilder(actorName, actorScope);
    },

    // Fluent `.on()` — delegates to a lazily-created Behavior so callers
    // can write `Actor("X").use(plugin).on("Command", "foo")` without the
    // explicit `[actorName]()` call.
    on(...args: unknown[]) {
      return (getBehavior() as any).on(...args);
    },

    [actorName]: () =>
      createBehavior(actorName, { ...builtInEventScope, ...actorScope }),
  };
}

export const Actor = <
  const Name extends string,
  const Ctx extends Record<any, any> = {
    name: Name;
    model: "gpt5";
    scope: {
      thread: {
        sender: {
          name: string;
        };
        reply(msg: string): boolean;
      };
      actions: {
        generateText: (params: { model: "gpt5"; prompt: string }) => string;
      };
    } & BuiltInEventScope;
  },
>(
  name: PascalCase<Name>,
): ActorBuilderResult<Name, Ctx> => {
  return makeActorBuilder(name as string, {}) as any;
};
