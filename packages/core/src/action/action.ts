import {
  Apply,
  ValidateTrigger,
  InferTriggerScope,
  Pretty,
  CamelCase,
} from "../helpers";
import { Steps } from "../steps";
import { StepRuntime } from "../steps/step";
import { TW } from "../core";
import { dispatch, type ConsoleLike, type LoggerConfig } from "../use";

type ActionBody<
  Name extends string,
  Ctx extends Record<any, any>,
> = TW.Contextual<Ctx> & {
  use(config: LoggerConfig): ActionBody<Name, Ctx>;
  run: Steps<Ctx>;
};

type SignatureBody<
  Name extends string,
  Ctx extends Record<any, any>,
  Signature,
> = {
  use(config: LoggerConfig): SignatureBody<Name, Ctx, Signature>;
  run<
    const Handler extends (
      this: TW.Scope<
        Pretty<
          Record<
            "input",
            Signature extends (...args: any) => any
              ? Parameters<Signature>
              : Signature extends TW.Handler
                ? Parameters<Apply<Signature, Ctx>>
                : never
          > &
            Ctx["scope"]
        >
      >,
    ) => Signature extends (...args: any) => any
      ? ReturnType<Signature>
      : Signature extends TW.Handler
        ? ReturnType<Apply<Signature, Ctx>>
        : never,
  >(
    run: Handler,
  ): {
    [key in Name]: Signature extends (...args: any) => any
      ? TW.Action<Name, Signature>
      : Signature extends TW.Handler
        ? TW.Action<Name, Apply<Signature, Ctx>, Record<"handler", Signature>>
        : never;
  };
};

type StepName = string & {};

export interface ActionFactory<
  Name extends string,
  Ctx extends Record<any, any> = {
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
    };
  },
> {
  use(config: LoggerConfig): this;
  sig<const Schema extends ((...args: any) => any) | TW.Handler>(): SignatureBody<
    Name,
    Ctx,
    Schema
  >;
  input<const Schema>(trigger?: ValidateTrigger<Schema>): Schema extends
    | ((...args: any) => any)
    | TW.Handler
    ? SignatureBody<Name, Ctx, Schema>
    : ActionBody<
        Name,
        {
          name: Ctx["name"];
          scope: InferTriggerScope<Schema> & Ctx["scope"];
          [TW.Step]: {
            name: "launchApp" | StepName;
            map: { launchApp: string };
          };
        }
      >;
  run: Steps<Ctx>;
}

const AsyncGeneratorFunction = (async function* () {}).constructor as Function;

export async function* tapWith(
  gen: AsyncGenerator<unknown, unknown>,
  log: LogFn,
): AsyncGenerator<unknown, unknown> {
  let next = await gen.next();
  while (!next.done) {
    log(next.value);
    yield next.value;
    next = await gen.next();
  }
  return next.value;
}

type StepEntry = Record<typeof StepRuntime, { name: string; handler: (...a: unknown[]) => unknown }>;
export type Scope = { input: unknown; get<T>(Cls: abstract new (...a: unknown[]) => T): T };

const SignalTag = Symbol.for("TW.Signal");
export const ActionEventTag = Symbol.for("TW.ActionEvent");

function actionEvent(obj: Record<string, unknown>) {
  return Object.defineProperty(obj, ActionEventTag, { value: true, enumerable: false });
}


async function* runStep(
  name: string,
  handler: (...a: unknown[]) => unknown,
  ctx: Record<string | symbol, unknown>,
): AsyncGenerator<unknown, unknown> {
  try {
    let result: unknown;
    if (handler instanceof AsyncGeneratorFunction) {
      result = yield* handler.call(ctx) as AsyncGenerator<unknown, unknown>;
    } else {
      result = await handler.call(ctx);
    }
    if (result !== null && typeof result === "object" && SignalTag in (result as object)) {
      yield result;
    }
    yield { ">": name, result };

    return result;
  } catch (error) {
    yield { ">": name, error };

    throw error;
  }
}

export async function* runAction(name: string, scope: Scope, handlers: unknown[]): AsyncGenerator<unknown, unknown> {
  let ctx: Record<string | symbol, unknown> = { ...scope };
  let last: unknown;

  yield { ">": name, input: scope.input };

  try {
    for (const handler of handlers) {
      if (handler !== null && typeof handler === "object" && StepRuntime in (handler as object)) {
        const { name: stepName, handler: fn } = (handler as StepEntry)[StepRuntime];
        last = yield* runStep(`${name}.${stepName}`, fn, ctx);
        ctx = { ...ctx, [stepName]: last };
      } else if (handler instanceof AsyncGeneratorFunction) {
        last = yield* (handler as (this: typeof ctx) => AsyncGenerator<unknown, unknown>).call(ctx);
      } else if (typeof handler === "function") {
        last = await (handler as (this: typeof ctx) => unknown).call(ctx);
        if (last !== null && typeof last === "object" && SignalTag in (last as object)) {
          yield last;
        }
      }
    }
  } catch (error) {
    yield { ">": name, error };
    throw error;
  }

  yield { ">": name, result: last };
  return last;
}

export function buildScope(
  inputMode: "first" | "args",
  args: unknown[],
  extra: Record<string | symbol, unknown> = {},
): Scope {
  const registry = new Map<unknown, unknown>();
  return {
    ...extra,
    input: inputMode === "args" ? args : args[0],
    signal(type: string, data: Record<string, unknown>) {
      const event = { ">": type, ...data };
      Object.defineProperty(event, SignalTag, { value: true, enumerable: false });
      return event;
    },
    get<T>(Cls: abstract new (...a: unknown[]) => T): T {
      if (registry.has(Cls)) return registry.get(Cls) as T;
      const Bound = Function.prototype.bind.call(
        Cls as unknown as Function,
        null,
      ) as new () => T;
      let instance: T;
      try {
        instance = new Bound();
      } catch {
        instance = new AbortController().signal as unknown as T;
      }
      registry.set(Cls, instance);
      return instance;
    },
  };
}

export function Action<const Name extends string>(
  name: CamelCase<Name>,
): ActionFactory<Name> {
  const actionName = name as string;
  let logger: ConsoleLike = console;

  function tap<G extends AsyncGenerator<unknown, unknown>>(gen: G): G {
    return tapWith(gen, dispatch(logger)) as G;
  }

  function detectLogger(config: LoggerConfig) {
    logger = config.target;
  }

  function createAction(inputMode: "first" | "args", handlers: unknown[]) {
    async function consume(...args: unknown[]) {
      const gen = tap(runAction(actionName, buildScope(inputMode, args), handlers));
      let item = await gen.next();
      while (!item.done) item = await gen.next();
      return item.value;
    }

    function stream(...args: unknown[]) {
      return tap(runAction(actionName, buildScope(inputMode, args), handlers));
    }

    return { [actionName]: Object.assign(consume, { stream }) };
  }

  const makeBody = (inputMode: "first" | "args") => ({
    use(config: unknown) { detectLogger(config); return this; },
    run(...handlers: unknown[]) {
      return createAction(inputMode, handlers);
    },
  });

  return {
    sig() { return makeBody("args"); },
    input(_schema?: unknown) { return makeBody("first"); },
    use(config: unknown) { detectLogger(config); return this; },
    run(...handlers: unknown[]) {
      return createAction("first", handlers);
    },
  } as any
}
