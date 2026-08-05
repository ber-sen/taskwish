import {
  RawLoggedStreamTag,
  RawStreamTag,
  buildScope,
  runAction,
  tapRawStreamWith,
  tapWith,
  unwrapStreamEvents,
  type ActionFactory,
} from "./action";
import type { ActionMeta, ValidateActionMeta } from "./action/meta";
import { Event } from "./event";
import {
  CamelCase,
  PascalCase,
  InferSchema,
  ValidateSchema,
  Pretty,
  ExtractActionName,
  AddActionsToCtx,
  DeepWriteable,
  QualifiedActionName,
  qualifyActionName,
  qualifyEventName,
  ToCamelCase,
  toCamelCaseName,
  splitQualifiedActionName,
} from "./helpers";
import { TW } from "./core";
import { dispatch, type ConsoleLike, type LoggerConfig } from "./use";
import { type Steps } from "./steps/steps";
import { ResultKind } from "./steps/hkt";

type BaseScope<Ctx> = Ctx extends Record<any, any> ? Ctx["scope"] : {};

type RuntimeResult<Result> =
  Awaited<Result> extends AsyncGenerator<any, infer Return, any>
    ? Awaited<Return>
    : Result extends Generator<any, infer Return, any>
      ? Return
      : Result;

type EventKeys<Scope> = {
  [K in keyof Scope]: Scope[K] extends TW.EventKind<infer Name, any>
    ? Name
    : never;
}[keyof Scope] &
  string;

type ExtractEventKind<Scope, EventName extends string> = {
  [K in keyof Scope]: Scope[K] extends TW.EventKind<infer Name, any, any>
    ? EventName extends Name
      ? Scope[K]
      : never
    : never;
}[keyof Scope];

type ExtractEventInput<Scope, EventName extends string> =
  ExtractEventKind<Scope, EventName> extends TW.EventKind<string, infer D>
    ? D
    : never;

type ExtractEventExtraScope<Scope, EventName extends string> =
  ExtractEventKind<Scope, EventName> extends TW.EventKind<string, any, infer S>
    ? S
    : {};

type EventHandlerName<EventName extends string> =
  EventName extends `${infer Actor}::${infer Name}`
    ? `on${Actor}${Name}`
    : EventName extends `${infer Actor}:${infer Name}`
      ? `on${Actor}${Name}`
      : `on${EventName}`;

type ActorEventExports<Scope, Actor extends string> = Pretty<{
  [K in keyof Scope as Scope[K] extends TW.EventKind<infer Name, any, any>
    ? Name extends `${Actor}::${string}`
      ? K extends `${string}::${string}`
        ? never
        : K
      : never
    : never]: Scope[K];
}>;

export type ScheduleInput = { expression: string; at: Date };

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

// ── Trait method implementation ───────────────────────────────────────────────

/** Extract the method part from a trait-method name: "::log" → "log" */
type TraitMethodPart<T extends string> = T extends `::${infer M}`
  ? ToCamelCase<M>
  : never;

/**
 * Pull the first-argument type out of a trait action's handler.
 * Yields `void` for no-arg handlers so the overload can produce `() => …`.
 *
 * Uses `Parameters<A>` rather than an `infer I` pattern so that
 * `() => R` correctly yields `void` instead of `unknown`.
 */
type ExtractTraitInput<A> = A extends (...args: any[]) => any
  ? Parameters<A> extends []
    ? void
    : Parameters<A>[0]
  : void;

/** Helper: `(input: I) => Promise<R>` when I is known, `() => Promise<R>` when void. */
type TraitActionHandler<I, R> = [I] extends [void]
  ? () => Promise<R>
  : (input: I) => Promise<R>;

/**
 * Extract the qualified action name carried inside a trait action's stream events.
 * e.g. TW.Action<"::read", …> → "::read".
 */
type ExtractTraitQualifiedName<A> =
  ExtractActionName<A> extends `::${string}` ? ExtractActionName<A> : never;

type TraitActionLike<TraitMethod extends `::${string}` = `::${string}`> = ((
  ...args: any[]
) => any) &
  TW.Resource<TraitMethod>;

type ExtractTraitEventName<A> = A extends TW.Attributable<infer Meta>
  ? Meta extends { event: infer EventName extends `::${string}` }
    ? EventName
    : never
  : never;

type TraitEventActionLike<EventName extends `::${string}` = `::${string}`> =
  TraitActionLike<EventName> & TW.Attributable<{ event: EventName }>;

/**
 * Returned by `Behavior.on(Storage.read)` — a fluent builder whose
 * input type is already fixed by the trait instance. No `.input()` call needed.
 */
interface TraitMethodFactoryFromTrait<
  TraitMethod extends `::${string}`,
  Ctx extends Record<any, any>,
  Input,
> {
  run<
    const H extends (
      this: TW.Scope<
        Pretty<
          ([Input] extends [void] ? {} : { input: Input }) & BaseScope<Ctx>
        >
      >,
    ) => any,
  >(
    handler: H,
  ): {
    [K in TraitMethodPart<TraitMethod>]: TW.Action<
      QualifiedActionName<Ctx["name"] & string, TraitMethodPart<TraitMethod>>,
      TraitActionHandler<Input, RuntimeResult<ReturnType<H>>>,
      { trait: TraitMethod }
    >;
  };
}

/** The actor factory function returned under an actor's name. */
export interface ActorFactoryFn<Ctx extends Record<any, any>> {
  (): Behavior<Ctx>;
  events: ActorEventExports<BaseScope<Ctx>, Ctx["name"] & string>;
}

type CommandResult<
  CmdName extends string,
  FlatIn,
  Method extends string,
  Path extends string,
  Schema,
  Scope extends Record<any, any>,
  Service extends string,
  Handler extends (...args: any[]) => any,
  Meta = {},
> = {
  [key in CmdName]: TW.Action<
    QualifiedActionName<Service, CmdName>,
    (input: FlatIn) => Promise<RuntimeResult<ReturnType<Handler>>>,
    {
      route: [
        Method,
        Path,
        Pretty<DeepWriteable<Schema> & DeepWriteable<Meta>>,
      ];
    }
  >;
} & {
  meta<
    const NextMeta extends ActionMeta<
      { scope: Pretty<{ input: FlatIn } & Scope> },
      RuntimeResult<ReturnType<Handler>>
    >,
  >(
    meta: ValidateActionMeta<
      NextMeta,
      { scope: Pretty<{ input: FlatIn } & Scope> },
      RuntimeResult<ReturnType<Handler>>
    >,
  ): CommandResult<
    CmdName,
    FlatIn,
    Method,
    Path,
    Schema,
    Scope,
    Service,
    Handler,
    Pretty<Meta & NextMeta>
  >;
};

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
  ): CommandResult<CmdName, FlatIn, Method, Path, Schema, Scope, Service, H>;
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
  use<const U>(plugin: U): Behavior<AddActionsToCtx<Ctx, U>>;

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

  on<const TraitEventAction extends TraitEventActionLike>(
    behavior: TraitEventAction,
  ): ActionFactory<
    EventHandlerName<ExtractTraitEventName<TraitEventAction>>,
    {
      name: EventHandlerName<ExtractTraitEventName<TraitEventAction>>;
      service: Ctx["name"] & string;
      meta: { event: ExtractTraitEventName<TraitEventAction> };
      scope: Pretty<
        ([ExtractTraitInput<TraitEventAction>] extends [void]
          ? {}
          : { input: ExtractTraitInput<TraitEventAction> }) &
          BaseScope<Ctx>
      >;
    }
  >;

  on<const TraitAction extends TraitActionLike>(
    traitMethod: TraitAction,
  ): TraitMethodFactoryFromTrait<
    ExtractTraitQualifiedName<TraitAction>,
    Ctx,
    ExtractTraitInput<TraitAction>
  >;

  on<const EventName extends EventKeys<BaseScope<Ctx>>>(
    behavior: EventName,
  ): ActionFactory<
    EventHandlerName<EventName>,
    {
      name: EventHandlerName<EventName>;
      service: Ctx["name"] & string;
      meta: { event: EventName };
      scope: {
        input: ExtractEventInput<BaseScope<Ctx>, EventName>;
      } & ExtractEventExtraScope<BaseScope<Ctx>, EventName> &
        BaseScope<Ctx>;
    }
  >;

  on<
    const EventName extends string,
    Input,
    ExtraScope extends Record<any, any> = {},
  >(
    behavior: TW.EventKind<EventName, Input, ExtraScope>,
  ): ActionFactory<
    EventHandlerName<EventName>,
    {
      name: EventHandlerName<EventName>;
      service: Ctx["name"] & string;
      meta: { event: EventName };
      scope: {
        input: Input;
      } & ExtraScope &
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

function eventHandlerName(eventName: string): string {
  if (eventName.includes("::")) {
    const [actor, event] = eventName.split("::");
    return `on${actor}${event}`;
  }
  if (eventName.includes(":")) {
    const [actor, event] = eventName.split(":");
    return `on${actor}${event}`;
  }
  return `on${eventName}`;
}

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

function scopeEventKind(
  actorName: string,
  eventName: string,
  eventKind: Record<string | symbol, unknown>,
): Record<string | symbol, unknown> {
  const qualifiedEventName = qualifyEventName(actorName, eventName);
  return {
    ...eventKind,
    [TW.Name]: qualifiedEventName,
    emit: async function* (eventData: unknown) {
      const emitted = new TW.Signal(qualifiedEventName, {
        id: null,
        data: eventData,
      });

      yield emitted;
      return emitted;
    },
  };
}

function collectScope(
  steps: unknown[],
  actorName?: string,
): Record<string, unknown> {
  const scope: Record<string, unknown> = {};
  for (const step of steps) {
    if (step !== null && typeof step === "object") {
      for (const key of Object.keys(step as object)) {
        const value = (step as Record<string, unknown>)[key];
        const scopedValue =
          actorName &&
          value !== null &&
          typeof value === "object" &&
          "emit" in value &&
          TW.Name in value &&
          typeof (value as Record<string | symbol, unknown>)[TW.Name] ===
            "string" &&
          !(
            (value as Record<string | symbol, unknown>)[TW.Name] as string
          ).includes("::")
            ? scopeEventKind(
                actorName,
                key,
                value as Record<string | symbol, unknown>,
              )
            : value;
        scope[key] = scopedValue;

        if (
          actorName &&
          value !== null &&
          typeof value === "object" &&
          "emit" in value &&
          TW.Name in value &&
          typeof (value as Record<string | symbol, unknown>)[TW.Name] ===
            "string" &&
          !(
            (value as Record<string | symbol, unknown>)[TW.Name] as string
          ).includes("::")
        ) {
          scope[qualifyEventName(actorName, key)] = scopedValue;
        }
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
  let behaviorScope: Record<string, unknown> = {};
  const pendingBehaviorScopes: Promise<Record<string, unknown>>[] = [];

  function tap<G extends AsyncGenerator<unknown, unknown>>(gen: G): G {
    return tapWith(gen, dispatch(logger)) as G;
  }

  const currentInitialScope = () => mergeActorScope(initialScope, behaviorScope);

  async function resolveBehaviorScope() {
    let resolved = await resolveInitialScope();
    if (Object.keys(behaviorScope).length > 0) {
      resolved = mergeActorScope(resolved, behaviorScope);
    }
    if (pendingBehaviorScopes.length > 0) {
      const scopes = await Promise.all(pendingBehaviorScopes);
      resolved = scopes.reduce(mergeActorScope, resolved);
    }
    return resolved;
  }

  function applyScopedUse(
    plugin: unknown,
    applyScope: (scope: Record<string, unknown>) => void,
    applyPendingScope: (scope: Promise<Record<string, unknown>>) => void,
  ) {
    if (isLoggerConfig(plugin)) {
      logger = plugin.target;
      return;
    }
    if (isPromiseLike(plugin)) {
      applyPendingScope(Promise.resolve(plugin).then(collectPluginScope));
      return;
    }

    const incoming = collectPluginScope(plugin);
    if (Object.keys(incoming).length > 0) applyScope(incoming);
  }

  const self = {
    use(plugin: unknown) {
      applyScopedUse(
        plugin,
        (incoming) => {
          behaviorScope = mergeActorScope(behaviorScope, incoming);
        },
        (incoming) => {
          pendingBehaviorScopes.push(incoming);
        },
      );
      return self;
    },
    on(
      behaviorInput: unknown,
      config?: string,
      schema?: unknown,
    ) {
      const eventKind = isEventKind(behaviorInput) ? behaviorInput : null;
      const traitEvent = getTraitEventName(behaviorInput);
      const traitMethod = getTraitMethodName(behaviorInput);
      const behavior =
        eventKind !== null && typeof eventKind[TW.Name] === "string"
          ? eventKind[TW.Name]
          : traitEvent !== null
          ? traitEvent
          : traitMethod !== null
          ? traitMethod
          : String(behaviorInput);
      let actionName: string;
      let traitMeta: string | null = null;
      let eventMeta: string | null = null;
      let actionScope: Record<string, unknown> = {};
      const pendingActionScopes: Promise<Record<string, unknown>>[] = [];

      const initialScopeAtOn =
        eventKind !== null
          ? mergeActorScope(currentInitialScope(), collectEvents(eventKind))
          : currentInitialScope();
      const scopedBehavior = initialScopeAtOn[behavior];
      const isScopedEvent =
        scopedBehavior !== null &&
        typeof scopedBehavior === "object" &&
        "emit" in scopedBehavior;
      if (traitEvent !== null && !isScopedEvent) {
        // Trait event: VoiceCall.VoiceCall → actionName = "onVoiceCall"
        actionName = eventHandlerName(traitEvent);
        eventMeta = traitEvent;
      } else if (traitMethod !== null && !isScopedEvent) {
        // Trait method: Logger.log → actionName = "log", traitMeta = "::log"
        actionName = toCamelCaseName(traitMethod.slice(2));
        traitMeta = traitMethod;
      } else if (behavior === "Command") {
        actionName = config!;
      } else if (HTTP_METHODS.has(behavior)) {
        actionName = behavior;
      } else {
        actionName = eventHandlerName(behavior);
        eventMeta = behavior;
      }

      const eventName = qualifyActionName(actorName, actionName);
      const mod = makeBehaviorMod(behavior, config, schema, initialScopeAtOn);
      let actionMeta: Record<string, unknown> | null = null;

      async function resolveActionScope() {
        let resolved = await resolveBehaviorScope();
        if (Object.keys(actionScope).length > 0) {
          resolved = mergeActorScope(resolved, actionScope);
        }
        if (pendingActionScopes.length > 0) {
          const scopes = await Promise.all(pendingActionScopes);
          resolved = scopes.reduce(mergeActorScope, resolved);
        }
        return resolved;
      }

      function useActionPlugin(plugin: unknown) {
        applyScopedUse(
          plugin,
          (incoming) => {
            actionScope = mergeActorScope(actionScope, incoming);
          },
          (incoming) => {
            pendingActionScopes.push(incoming);
          },
        );
      }

      function createAction(
        inputMode: "first" | "args",
        handlers: unknown[],
        inputSchema?: unknown,
      ) {
        async function consume(...args: unknown[]) {
          const resolvedInitialScope = await resolveActionScope();
          const { args: modArgs, scope: behaviorScope } = mod(args);
          const extra = { ...resolvedInitialScope, ...behaviorScope };
          const gen = tap(
            unwrapStreamEvents(
              runAction(
                eventName,
                buildScope(inputMode, modArgs, extra),
                handlers,
              ),
            ),
          );
          let item = await gen.next();
          while (!item.done) item = await gen.next();
          return item.value;
        }

        async function* rawStream(...args: unknown[]) {
          const resolvedInitialScope = await resolveActionScope();
          const { args: modArgs, scope: behaviorScope } = mod(args);
          const extra = { ...resolvedInitialScope, ...behaviorScope };
          return yield* runAction(
            eventName,
            buildScope(inputMode, modArgs, extra),
            handlers,
          );
        }

        function stream(...args: unknown[]) {
          return tap(unwrapStreamEvents(rawStream(...args)));
        }

        function loggedRawStream(...args: unknown[]) {
          return tapRawStreamWith(rawStream(...args), dispatch(logger));
        }

        const resolveMeta = () =>
          traitMeta !== null || eventMeta !== null || actionMeta !== null
            ? {
                ...(traitMeta !== null ? { trait: traitMeta } : {}),
                ...(eventMeta !== null ? { event: eventMeta } : {}),
                ...(actionMeta ?? {}),
              }
            : null;
        const action = Object.assign(consume, {
          [TW.Name]: eventName,
          stream,
          [TW.Meta]: resolveMeta(),
          [TW.InputSchema]: inputSchema,
          [RawStreamTag]: rawStream,
          [RawLoggedStreamTag]: loggedRawStream,
        });
        const result = {
          [actionName]: action,
          meta(meta: Record<string, unknown>) {
            actionMeta = { ...(actionMeta ?? {}), ...meta };
            action[TW.Meta] = resolveMeta();
            return result;
          },
        };

        return result;
      }

      const makeBody = (inputMode: "first" | "args", inputSchema?: unknown) => ({
        use(plugin?: unknown) {
          if (arguments.length > 0) useActionPlugin(plugin);
          return this;
        },
        run(...handlers: unknown[]) {
          return createAction(inputMode, handlers, inputSchema);
        },
      });

      const base = {
        sig() {
          return makeBody("args");
        },
        input(inputSchema?: unknown) {
          return makeBody("first", inputSchema);
        },
        use(plugin?: unknown) {
          if (arguments.length > 0) useActionPlugin(plugin);
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
              use(plugin?: unknown) {
                if (arguments.length > 0) useActionPlugin(plugin);
                return this;
              },
              run(...handlers: unknown[]) {
                const qualifiedCmdName = qualifyActionName(actorName, cmdName);

                async function* rawCmdStream(flatInput: unknown) {
                  const resolvedInitialScope = await resolveActionScope();
                  return yield* runAction(
                    qualifiedCmdName,
                    buildScope("first", [flatInput], {
                      ...resolvedInitialScope,
                    }),
                    handlers,
                  );
                }

                function cmdStream(flatInput: unknown) {
                  return tap(unwrapStreamEvents(rawCmdStream(flatInput)));
                }

                function loggedRawCmdStream(flatInput: unknown) {
                  return tapRawStreamWith(
                    rawCmdStream(flatInput),
                    dispatch(logger),
                  );
                }

                async function cmdConsume(flatInput: unknown) {
                  const gen = tap(unwrapStreamEvents(rawCmdStream(flatInput)));
                  let item = await gen.next();
                  while (!item.done) item = await gen.next();
                  return item.value;
                }

                const resolveMeta = () => ({
                  route: [
                    behavior,
                    config,
                    {
                      ...(schema as Record<string, unknown>),
                      ...commandMeta,
                    },
                  ],
                });
                const action = Object.assign(cmdConsume, {
                  [TW.Name]: qualifiedCmdName,
                  [TW.Meta]: resolveMeta(),
                  [TW.InputSchema]: schema,
                  stream: cmdStream,
                  [RawStreamTag]: rawCmdStream,
                  [RawLoggedStreamTag]: loggedRawCmdStream,
                });
                const result = {
                  [cmdName]: action,
                  meta(meta: Record<string, unknown>) {
                    commandMeta = { ...commandMeta, ...meta };
                    action[TW.Meta] = resolveMeta();
                    return this;
                  },
                };

                return result;
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

function isLoggerConfig(value: unknown): value is LoggerConfig {
  return (
    value !== null &&
    typeof value === "object" &&
    (value as Record<string | symbol, unknown>)[TW.Type] === "Logger" &&
    "target" in value
  );
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    "then" in value &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

function exposeAction(plugin: unknown) {
  return typeof plugin === "function" &&
    RawStreamTag in plugin &&
    typeof (plugin as { [RawStreamTag]?: unknown })[RawStreamTag] ===
      "function"
    ? (plugin as { [RawStreamTag]: (...args: unknown[]) => unknown })[
        RawStreamTag
      ]
    : typeof plugin === "function" &&
    "stream" in plugin &&
    typeof (plugin as { stream?: unknown }).stream === "function"
    ? (plugin as { stream: (...args: unknown[]) => unknown }).stream
    : plugin;
}

function collectAction(plugin: unknown): Record<string, unknown> {
  const fullName: unknown = (plugin as any)[TW.Name];
  if (typeof fullName !== "string") return {};

  const qualified = splitQualifiedActionName(fullName);
  const exposed = exposeAction(plugin);
  if (qualified === null) return { [fullName]: exposed };

  const service =
    qualified.service.charAt(0).toLowerCase() + qualified.service.slice(1);
  const method = qualified.method;

  return { [service]: { [method]: exposed } };
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

function isEventKind(
  value: unknown,
): value is Record<string | symbol, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    "emit" in value &&
    TW.Name in value
  );
}

function getTraitMethodName(value: unknown): `::${string}` | null {
  if (
    value === null ||
    (typeof value !== "object" && typeof value !== "function") ||
    !(TW.Name in Object(value))
  ) {
    return null;
  }

  const name = (value as Record<string | symbol, unknown>)[TW.Name];
  return typeof name === "string" && name.startsWith("::")
    ? (name as `::${string}`)
    : null;
}

function getTraitEventName(value: unknown): `::${string}` | null {
  if (
    value === null ||
    (typeof value !== "object" && typeof value !== "function") ||
    !(TW.Meta in Object(value))
  ) {
    return null;
  }

  const meta = (value as Record<string | symbol, unknown>)[TW.Meta];
  const event =
    meta !== null && typeof meta === "object"
      ? (meta as Record<string, unknown>).event
      : null;

  return typeof event === "string" && event.startsWith("::")
    ? (event as `::${string}`)
    : null;
}

function eventScopeKey(eventName: string): string {
  return eventName;
}

function hasEventExports(value: unknown): value is { events: unknown } {
  return (
    value !== null &&
    (typeof value === "object" || typeof value === "function") &&
    "events" in value
  );
}

function collectOwnedEvents(
  actorName: string,
  scope: Record<string, unknown>,
): Record<string, unknown> {
  const events: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(scope)) {
    if (!isEventKind(value)) continue;
    const eventName = value[TW.Name];
    if (
      typeof eventName === "string" &&
      eventName.startsWith(`${actorName}::`) &&
      !key.includes("::")
    ) {
      events[key] = value;
    }
  }
  return events;
}

function collectEvents(plugin: unknown): Record<string, unknown> {
  if (isEventKind(plugin)) {
    const eventName = plugin[TW.Name];
    return typeof eventName === "string"
      ? { [eventScopeKey(eventName)]: plugin }
      : {};
  }
  if (hasEventExports(plugin)) {
    return collectEvents(plugin.events);
  }
  if (plugin === null || typeof plugin !== "object") return {};

  const incoming: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(
    plugin as Record<string, unknown>,
  )) {
    if (!isEventKind(value)) continue;
    const eventName = value[TW.Name];
    incoming[key] = value;
    if (typeof eventName === "string") {
      incoming[eventScopeKey(eventName)] = value;
    }
  }
  return incoming;
}

function collectPluginScope(plugin: unknown): Record<string, unknown> {
  const actions = collectActions(plugin);
  return {
    ...collectEvents(plugin),
    ...(Object.keys(actions).length > 0 ? { actions } : {}),
  };
}

function mergeActorScope(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const { actions: incomingActions, ...incomingScope } = incoming;
  const next: Record<string, unknown> = {
    ...existing,
    ...incomingScope,
  };

  if (
    incomingActions !== null &&
    typeof incomingActions === "object" &&
    Object.keys(incomingActions as Record<string, unknown>).length > 0
  ) {
    next.actions = mergeActions(
      (existing.actions as Record<string, unknown> | undefined) ?? {},
      incomingActions as Record<string, unknown>,
    );
  }

  return next;
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
    return pluginScopes.reduce(mergeActorScope, actorScope);
  };

  const getBehavior = () => {
    if (!_behavior)
      _behavior = createBehavior(
        actorName,
        {
          ...builtInEventScope,
          ...actorScope,
        },
        async () => ({
          ...builtInEventScope,
          ...(await resolveActorScope()),
        }),
      );
    return _behavior;
  };

  const createActorFactory = (
    behaviorScope: Record<string, unknown>,
    resolveBehaviorScope: () => Promise<Record<string, unknown>>,
    eventScope: () => Record<string, unknown>,
  ) =>
    Object.assign(
      () => createBehavior(actorName, behaviorScope, resolveBehaviorScope),
      {
        get events() {
          return collectOwnedEvents(actorName, eventScope());
        },
      },
    );

  return {
    def(...steps: unknown[]) {
      const definedScope = collectScope(steps, actorName);
      const initialScope = {
        ...builtInEventScope,
        ...actorScope,
        ...definedScope,
      };
      return {
        [actorName]: createActorFactory(
          initialScope,
          async () => ({
            ...builtInEventScope,
            ...(await resolveActorScope()),
            ...collectScope(steps, actorName),
          }),
          () => definedScope,
        ),
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
          Promise.resolve(plugin).then(collectPluginScope),
        ]);
      }

      const incoming = collectPluginScope(plugin);
      if (Object.keys(incoming).length === 0)
        return makeActorBuilder(actorName, actorScope);

      return makeActorBuilder(
        actorName,
        mergeActorScope(actorScope, incoming),
        pendingPlugins,
      );
    },

    // Fluent `.on()` — delegates to a lazily-created Behavior so callers
    // can write `Actor("X").use(plugin).on("Command", "foo")` without the
    // explicit `[actorName]()` call.
    on(...args: unknown[]) {
      return (getBehavior() as any).on(...args);
    },

    [actorName]: createActorFactory(
      { ...builtInEventScope, ...actorScope },
      async () => ({
        ...builtInEventScope,
        ...(await resolveActorScope()),
      }),
      () => actorScope,
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
