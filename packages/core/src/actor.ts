import { buildScope, runAction, tapWith, type ActionFactory } from "./action";
import { Event } from "./event";
import {
  CamelCase,
  PascalCase,
  InferSchema,
  ValidateSchema,
  Pretty,
} from "./helpers";
import { TW } from "./core";
import { dispatch, type ConsoleLike, type LoggerConfig } from "./use";

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

interface HttpBody<Method extends string, Scope extends Record<any, any>> {
  use(): this;
  run<
    H extends (
      this: TW.Scope<Pretty<{ input: Request; request: Request } & Scope>>,
    ) => any,
  >(
    handler: H,
  ): {
    [key in Method]: TW.Action<
      Method,
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
> {
  use(): this;
  run<
    const H extends (this: TW.Scope<Pretty<{ input: FlatIn } & Scope>>) => any,
  >(
    handler: H,
    ...rest: unknown[]
  ): {
    [key in CmdName]: TW.Action<
      CmdName,
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

interface Behavior<Ctx> {
  use(config: LoggerConfig): this;

  on<Name extends string>(
    behavior: "Command",
    name: CamelCase<Name>,
  ): ActionFactory<Name, { name: Name; scope: BaseScope<Ctx> }>;

  on(
    behavior: "Schedule",
    expression?: string,
  ): ActionFactory<
    "onSchedule",
    { name: "onSchedule"; scope: { input: ScheduleInput } & BaseScope<Ctx> }
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
      BaseScope<Ctx>
    >;
  };

  on<const Method extends "GET" | "POST" | "PUT" | "DELETE" | "PATCH">(
    behavior: Method,
    path: string,
  ): HttpBody<Method, BaseScope<Ctx>>;

  on<const EventName extends EventKeys<BaseScope<Ctx>>>(
    behavior: EventName,
  ): ActionFactory<
    `on${EventName}`,
    {
      name: `on${EventName}`;
      scope: {
        input: ExtractEventInput<BaseScope<Ctx>, EventName>;
      } & ExtractEventExtraScope<BaseScope<Ctx>, EventName> &
        BaseScope<Ctx>;
    }
  >;
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
  if (typeof result === "string") return new Response(result, { headers: { "Content-Type": "text/plain" } });
  return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
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

  const self: Behavior<any> = {
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
          const gen = tap(runAction(eventName, buildScope(inputMode, modArgs, extra), handlers));
          let item = await gen.next();
          while (!item.done) item = await gen.next();
          return item.value;
        }

        function stream(...args: unknown[]) {
          const { args: modArgs, scope: behaviorScope } = mod(args);
          const extra = { ...initialScope, ...behaviorScope };
          return tap(runAction(eventName, buildScope(inputMode, modArgs, extra), handlers));
        }

        return { [actionName]: Object.assign(consume, { stream }) };
      }

      const makeBody = (inputMode: "first" | "args") => ({
        use() { return this; },
        run(...handlers: unknown[]) {
          return createAction(inputMode, handlers);
        },
      });

      const base = {
        sig() { return makeBody("args"); },
        input(_schema?: unknown) { return makeBody("first"); },
        use() { return this; },
        run(...handlers: unknown[]) {
          return createAction("first", handlers);
        },
      };

      if (HTTP_METHODS.has(behavior) && schema) {
        return {
          ...base,
          command(cmdName: string) {
            return {
              use() { return this; },
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
                  yield { $: eventName, input: rawInput };
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
                    yield { $: eventName, error };
                    throw error;
                  }
                  yield { $: eventName, result: toResponse(result) };
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

  return self;
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
        slack: {
          [key: `@${string}`]: {
            sendMessage: (params: {
              channel: "#general";
              message: string;
            }) => string;
          };
        } & {
          sendMessage: (params: {
            "@"?: string;
            channel: "#general";
            message: string;
          }) => string;
        };
      };
    } & BuiltInEventScope;
  },
>(
  name: PascalCase<Name>,
): {
  def<A>(step: { [TW.Step]: (input: Ctx) => A }): {
    [key in Name]: () => Behavior<A>;
  };
  def<A, B>(
    step1: { [TW.Step]: (input: Ctx) => A },
    step2: { [TW.Step]: (input: A) => B },
  ): {
    [key in Name]: () => Behavior<B>;
  };
  def<A, B, C>(
    step1: { [TW.Step]: (input: Ctx) => A },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
  ): {
    [key in Name]: () => Behavior<C>;
  };
} & {
  [key in Name]: () => Behavior<Ctx>;
} => {
  const actorName = name as string;
  return {
    def(...steps: unknown[]) {
      const initialScope = { ...builtInEventScope, ...collectScope(steps) };
      return {
        [actorName]: () => createBehavior(actorName, initialScope),
      } as any;
    },
    [actorName]: () => createBehavior(actorName, builtInEventScope),
  } as any;
};

export class TWActor<Name extends string> implements TW.Actor<Name> {
  public [TW.Name]: Name;

  constructor(name: Name) {
    this[TW.Name] = name;
  }
}
