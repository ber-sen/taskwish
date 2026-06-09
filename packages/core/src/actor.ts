import {
  buildScope,
  runAction,
  tapWith,
  type ActionFactory,
  type ActionMeta,
  type ValidateActionMeta,
} from "./action";
import { Event } from "./event";
import {
  CamelCase,
  PascalCase,
  InferSchema,
  ValidateSchema,
  Pretty,
  ExtractActionName,
  AddActionsToCtx,
  InferTriggerScope,
  DeepWriteable
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



// ── Trait method implementation ───────────────────────────────────────────────

/** Extract the method part from a dotted trait-method name: "Logger.log" → "log" */
type TraitMethodPart<T extends string> = T extends `${string}.${infer M}` ? M : never;

/**
 * Pull the first-argument type out of a trait action's handler.
 * Yields `void` for no-arg handlers so the overload can produce `() => …`.
 *
 * Uses `Parameters<A>` rather than an `infer I` pattern so that
 * `() => R` correctly yields `void` instead of `unknown`.
 */
type ExtractTraitInput<A> =
  A extends (...args: any[]) => any
    ? Parameters<A> extends []
      ? void
      : Parameters<A>[0]
    : void;

/** Helper: `(input: I) => Promise<R>` when I is known, `() => Promise<R>` when void. */
type TraitActionHandler<I, R> =
  [I] extends [void] ? () => Promise<R> : (input: I) => Promise<R>;

/**
 * Extract the trait-name prefix from the qualified action name carried inside
 * a trait action's stream events.  e.g. TW.Action<"Storage.read", …> → "Storage".
 */
type ExtractTraitPrefix<A> =
  ExtractActionName<A> extends `${infer P}.${string}` ? P : never;

/**
 * Derive all valid dotted method strings for a trait instance, e.g.
 *   { read: TW.Action<"Storage.read", …>, write: TW.Action<"Storage.write", …> }
 *     → "Storage.read" | "Storage.write"
 */
type AllTraitMethods<TraitInstance extends Record<string, any>> = {
  [M in keyof TraitInstance & string]:
    ExtractTraitPrefix<TraitInstance[M]> extends infer P extends string
      ? `${P}.${M}`
      : never;
}[keyof TraitInstance & string];

/**
 * Returned by `TraitBehavior.on("Storage.read")` — a fluent builder whose
 * input type is already fixed by the trait instance. No `.input()` call needed.
 */
interface TraitMethodFactoryFromTrait<
  TraitMethod extends `${string}.${string}`,
  Ctx extends Record<any, any>,
  Input,
> {
  run<
    const H extends (
      this: TW.Scope<
        Pretty<([Input] extends [void] ? {} : { input: Input }) & BaseScope<Ctx>>
      >
    ) => any,
  >(
    handler: H,
  ): {
    [K in TraitMethodPart<TraitMethod>]: TW.Action<
      `${Ctx["name"] & string}.${TraitMethodPart<TraitMethod>}`,
      TraitActionHandler<Input, Awaited<ReturnType<H>>>,
      { trait: TraitMethod }
    >;
  };
}

/**
 * Resolve the factory type for a specific dotted key, threading the matching
 * trait method's input type through from the instance.
 */
type TraitMethodFactoryFor<
  TraitInstance extends Record<string, any>,
  K extends `${string}.${string}`,
  Ctx extends Record<any, any>,
> = K extends `${string}.${infer M}`
  ? M extends keyof TraitInstance
    ? TraitMethodFactoryFromTrait<K, Ctx, ExtractTraitInput<TraitInstance[M]>>
    : never
  : never;

/**
 * Returned by `Actor("S3Storage")(storage)` — `.on()` is constrained to the
 * trait's own dotted method names, with each method's input type inferred from
 * the trait instance.
 */
interface TraitBehavior<
  Ctx extends Record<any, any>,
  TraitInstance extends Record<string, any>,
> {
  on<const K extends AllTraitMethods<TraitInstance>>(
    traitMethod: K,
  ): TraitMethodFactoryFor<TraitInstance, K, Ctx>;
}

/**
 * The actor factory function — overloaded:
 *   - `()` → `Behavior<Ctx>` (existing, full overload set)
 *   - `(traitInstance)` → `TraitBehavior<Ctx, T>` (typed input from trait)
 *
 * The `trait` parameter accepts either a plain trait object or a `Promise`
 * of one (e.g. `import("./storage.ts")`). TypeScript infers `T` as the
 * unwrapped record in both cases.
 */
export interface ActorFactoryFn<Ctx extends Record<any, any>> {
  (): Behavior<Ctx>;
  <const T extends Record<string, any>>(
    trait: T | Promise<T>,
  ): TraitBehavior<Ctx, T>;
}

/**
 * Returned by `Behavior.on("Logger.log")` (no trait instance passed) —
 * a fluent builder that requires `.input(schema)` to specify the input type.
 */
interface TraitMethodFactory<
  TraitMethod extends `${string}.${string}`,
  Ctx extends Record<any, any>,
> {
  use(): this;

  input<const Schema>(
    schema?: Schema,
  ): TraitMethodFactory<
    TraitMethod,
    Omit<Ctx, "scope"> & {
      scope: Pretty<InferTriggerScope<Schema> & BaseScope<Ctx>>;
    }
  >;

  run<
    const H extends (
      this: TW.Scope<Pretty<BaseScope<Ctx>>>
    ) => any,
  >(
    handler: H,
  ): {
    [K in TraitMethodPart<TraitMethod>]: TW.Action<
      `${Ctx["name"] & string}.${TraitMethodPart<TraitMethod>}`,
      "input" extends keyof BaseScope<Ctx>
        ? (input: BaseScope<Ctx>["input"]) => Promise<Awaited<ReturnType<H>>>
        : () => Promise<Awaited<ReturnType<H>>>,
      { trait: TraitMethod }
    >;
  };
}

interface CommandBody<
  CmdName extends string,
  FlatIn,
  Method extends string,
  Path extends string,
  Schema,
  Scope extends Record<any, any>,
  Service extends string,
  Meta = {},
> {
  use(): this;
  meta<
    const NextMeta extends ActionMeta<{
      scope: Pretty<{ input: FlatIn } & Scope>;
    }>,
  >(
    meta: ValidateActionMeta<
      NextMeta,
      {
        scope: Pretty<{ input: FlatIn } & Scope>;
      }
    >,
  ): CommandBody<
    CmdName,
    FlatIn,
    Method,
    Path,
    Schema,
    Scope,
    Service,
    NextMeta
  >;
  run<
    const H extends (this: TW.Scope<Pretty<{ input: FlatIn } & Scope>>) => any,
  >(
    handler: H,
    ...rest: unknown[]
  ): {
    [key in CmdName]: TW.Action<
      `${Service}.${CmdName}`,
      (input: FlatIn) => Promise<Awaited<ReturnType<H>>>,
      {
        route: [
          Method,
          Path,
          Pretty<DeepWriteable<Schema> & DeepWriteable<Meta>>,
        ];
      }
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

  on<const TraitMethod extends `${string}.${string}`>(
    traitMethod: TraitMethod,
  ): TraitMethodFactory<TraitMethod, Ctx>;

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
            [name in this["ctx"]["name"]]: ActorFactoryFn<
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
  resolveInitialScope: () => Promise<Record<string, unknown>> = async () =>
    initialScope,
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
      let traitMeta: string | null = null;

      const dotIdx = behavior.indexOf(".");
      if (dotIdx !== -1) {
        // Trait method: "Logger.log" → actionName = "log", traitMeta = "Logger.log"
        actionName = behavior.slice(dotIdx + 1);
        traitMeta = behavior;
      } else if (behavior === "Command") {
        actionName = config!;
      } else if (HTTP_METHODS.has(behavior)) {
        actionName = behavior;
      } else {
        actionName = `on${behavior}`;
      }

      const eventName = `${actorName}.${actionName}`;
      const mod = makeBehaviorMod(behavior, config, schema, initialScope);
      let actionMeta: Record<string, unknown> | null = null;

      function createAction(inputMode: "first" | "args", handlers: unknown[]) {
        async function consume(...args: unknown[]) {
          const resolvedInitialScope = await resolveInitialScope();
          const { args: modArgs, scope: behaviorScope } = mod(args);
          const extra = { ...resolvedInitialScope, ...behaviorScope };
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

        async function* rawStream(...args: unknown[]) {
          const resolvedInitialScope = await resolveInitialScope();
          const { args: modArgs, scope: behaviorScope } = mod(args);
          const extra = { ...resolvedInitialScope, ...behaviorScope };
          yield* runAction(
            eventName,
            buildScope(inputMode, modArgs, extra),
            handlers,
          );
        }

        function stream(...args: unknown[]) {
          return tap(rawStream(...args));
        }

        return {
          [actionName]: Object.assign(consume, {
            [TW.Name]: eventName,
            stream,
            [TW.Meta]:
              traitMeta !== null || actionMeta !== null
                ? {
                    ...(traitMeta !== null ? { trait: traitMeta } : {}),
                    ...(actionMeta ?? {}),
                  }
                : null,
          }),
        };
      }

      const makeBody = (inputMode: "first" | "args") => ({
        use() {
          return this;
        },
        meta(meta: Record<string, unknown>) {
          actionMeta = meta;
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
        meta(meta: Record<string, unknown>) {
          actionMeta = meta;
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
            let commandMeta: Record<string, unknown> = {};
            return {
              use() {
                return this;
              },
              meta(meta: Record<string, unknown>) {
                commandMeta = meta;
                return this;
              },
              run(...handlers: unknown[]) {
                const qualifiedCmdName = `${actorName}.${cmdName}`;

                async function* rawCmdStream(flatInput: unknown) {
                  const resolvedInitialScope = await resolveInitialScope();
                  return yield* runAction(
                    qualifiedCmdName,
                    buildScope("first", [flatInput], {
                      ...resolvedInitialScope,
                    }),
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
                  const resolvedInitialScope = await resolveInitialScope();
                  const request = input;
                  const { args: modArgs } = mod([request]);
                  const rawInput = modArgs[0] as Record<string, unknown>;
                  yield { ">": eventName, input: rawInput };
                  const flatInput = flattenHttpInput(rawInput);
                  let result: unknown;
                  try {
                    const inner = runAction(
                      qualifiedCmdName,
                      buildScope("first", [flatInput], {
                        ...resolvedInitialScope,
                      }),
                      handlers,
                    );
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
                    [TW.Name]: qualifiedCmdName,
                    [TW.Meta]: {
                      route: [
                        behavior,
                        config,
                        {
                          ...(schema as Record<string, unknown>),
                          ...commandMeta,
                        },
                      ],
                    },
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
export type ActorBuilderResult<
  Name extends string,
  Ctx extends Record<any, any>,
> = {
  def: Steps<Ctx, DefResultKind>;
  use<const U>(plugin: U): ActorBuilderResult<Name, AddActionsToCtx<Ctx, U>>;
} & {
  [key in Name]: ActorFactoryFn<Ctx>;
} & Omit<Behavior<Ctx>, "use">;

// ── Actor builder runtime ─────────────────────────────────────────────────────

function collectAction(plugin: unknown): Record<string, unknown> {
  const fullName: unknown = (plugin as any)[TW.Name];
  if (typeof fullName !== "string") return {};

  const dot = fullName.indexOf(".");
  if (dot === -1) return { [fullName]: plugin };

  const rawService = fullName.slice(0, dot);
  const service = rawService.charAt(0).toLowerCase() + rawService.slice(1);
  const method = fullName.slice(dot + 1);

  return { [service]: { [method]: plugin } };
}

function mergeActions(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
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

  return merged;
}

function collectActions(plugin: unknown): Record<string, unknown> {
  if (typeof plugin === "function") return collectAction(plugin);
  if (plugin === null || typeof plugin !== "object") return {};

  let incoming: Record<string, unknown> = {};
  for (const value of Object.values(plugin as Record<string, unknown>)) {
    if (typeof value !== "function") continue;
    incoming = mergeActions(incoming, collectAction(value));
  }

  return incoming;
}

function makeActorBuilder(
  actorName: string,
  actorScope: Record<string, unknown>,
  pendingPlugins: Promise<Record<string, unknown>>[] = [],
): any {
  // Lazily-created behavior for fluid `.on()` calls directly on the builder.
  let _behavior: ReturnType<typeof createBehavior> | null = null;
  const resolveActorScope = async () => {
    if (pendingPlugins.length === 0) return actorScope;

    const pluginScopes = await Promise.all(pendingPlugins);
    let actions =
      (actorScope.actions as Record<string, unknown> | undefined) ?? {};
    for (const pluginActions of pluginScopes) {
      actions = mergeActions(actions, pluginActions);
    }

    return { ...actorScope, actions };
  };

  const getBehavior = () => {
    if (!_behavior)
      _behavior = createBehavior(actorName, {
        ...builtInEventScope,
        ...actorScope,
      }, async () => ({
        ...builtInEventScope,
        ...(await resolveActorScope()),
      }));
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
        [actorName]: (_trait?: unknown) =>
          createBehavior(actorName, initialScope, async () => ({
            ...builtInEventScope,
            ...(await resolveActorScope()),
            ...collectScope(steps),
          })),
      } as any;
    },

    use(plugin: unknown): any {
      if (
        plugin !== null &&
        typeof plugin === "object" &&
        "then" in (plugin as object)
      ) {
        return makeActorBuilder(actorName, actorScope, [
          ...pendingPlugins,
          Promise.resolve(plugin).then(collectActions),
        ]);
      }

      const incoming = collectActions(plugin);
      if (Object.keys(incoming).length === 0)
        return makeActorBuilder(actorName, actorScope);

      const existing =
        (actorScope.actions as Record<string, unknown> | undefined) ?? {};
      return makeActorBuilder(
        actorName,
        {
          ...actorScope,
          actions: mergeActions(existing, incoming),
        },
        pendingPlugins,
      );
    },

    // Fluent `.on()` — delegates to a lazily-created Behavior so callers
    // can write `Actor("X").use(plugin).on("Command", "foo")` without the
    // explicit `[actorName]()` call.
    on(...args: unknown[]) {
      return (getBehavior() as any).on(...args);
    },

    [actorName]: (_trait?: unknown) =>
      createBehavior(
        actorName,
        { ...builtInEventScope, ...actorScope },
        async () => ({
          ...builtInEventScope,
          ...(await resolveActorScope()),
        }),
      ),
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
