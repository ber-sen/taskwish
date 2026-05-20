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
import { dispatch, LogFn, type ConsoleLike, type LoggerConfig } from "../use";

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

type IfEntry = { condition: unknown; steps: unknown[] };
type ElseEntry = { steps: unknown[] };
type LoopEntry = { name: string; items: unknown; steps: unknown[] };

function twType(handler: unknown): string | null {
  return handler !== null && typeof handler === "object"
    ? ((handler as any)[TW.Type] as string | undefined) ?? null
    : null;
}

async function evalCond(condition: unknown, ctx: Record<string | symbol, unknown>): Promise<boolean> {
  const val = typeof condition === "function"
    ? await (condition as (scope: unknown) => unknown).call(ctx, ctx)
    : twType(condition) === "Condition"
      ? await ((condition as any).fn as (scope: unknown) => unknown).call(ctx, ctx)
      : condition;
  return Boolean(val);
}


async function* runHandlerList(
  name: string,
  handlers: unknown[],
  ctx: Record<string | symbol, unknown>,
  loopAcc: Record<string, unknown[]> | null,
): AsyncGenerator<unknown, { last: unknown; lastStepName: string | null; lastCond: boolean | null }> {
  let last: unknown;
  let lastStepName: string | null = null;
  let lastCond: boolean | null = null;

  const recordStep = (stepName: string, value: unknown) => {
    ctx[stepName] = value;
    if (loopAcc) {
      if (!loopAcc[stepName]) loopAcc[stepName] = [];
      loopAcc[stepName].push(value);
    }
    lastStepName = stepName;
    last = value;
  };

  const adopt = (r: { last: unknown; lastStepName: string | null }) => {
    last = r.last;
    if (r.lastStepName) lastStepName = r.lastStepName;
  };

  for (const handler of handlers) {
    const type = twType(handler);

    if (type === "If") {
      const { condition, steps } = handler as IfEntry;
      const isCondNode = twType(condition) === "Condition";
      let condRaw: unknown;
      if (isCondNode) {
        condRaw = await ((condition as any).fn as Function).call(ctx, ctx);
        lastCond = Boolean(condRaw);
      } else {
        lastCond = await evalCond(condition, ctx);
      }
      
      if (lastCond) {
        if (isCondNode) ctx["condition"] = condRaw;
        adopt(yield* runHandlerList(`${name}.if`, steps as unknown[], ctx, loopAcc));
      }
    } else if (type === "ElseIf") {
      if (lastCond === false) {
        const { condition, steps } = handler as IfEntry;
        const isCondNode = twType(condition) === "Condition";
        let condRaw: unknown;
        if (isCondNode) {
          condRaw = await ((condition as any).fn as Function).call(ctx, ctx);
          lastCond = Boolean(condRaw);
        } else {
          lastCond = await evalCond(condition, ctx);
        }
        
        if (lastCond) {
          if (isCondNode) ctx["condition"] = condRaw;
          adopt(yield* runHandlerList(`${name}.elseIf`, steps as unknown[], ctx, loopAcc));
        }
      }
    } else if (type === "Else") {
      if (lastCond === false) {
        adopt(yield* runHandlerList(`${name}.else`, (handler as ElseEntry).steps as unknown[], ctx, loopAcc));
      }
      lastCond = null;
    } else if (type === "Loop") {
      lastCond = null;
      const { name: loopName, items: itemsGetter, steps } = handler as LoopEntry;
      const items = typeof itemsGetter === "function"
        ? await (itemsGetter as (scope: unknown) => unknown).call(ctx, ctx)
        : twType(itemsGetter) === "ForEach"
          ? await ((itemsGetter as any).fn as (scope: unknown) => unknown).call(ctx, ctx)
          : typeof itemsGetter === "string"
            ? (itemsGetter as string).split(".").reduce((o: any, k) => o?.[k], ctx)
            : itemsGetter;
      yield { ">": `${name}.${loopName}`, items };
      const innerAcc: Record<string, unknown[]> = {};
      let loopLastStepName: string | null = null;
      const flatSteps = steps as unknown[];
      for (let index = 0; index < (items as unknown[]).length; index++) {
        ctx[loopName] = { item: (items as unknown[])[index], index };
        const r = yield* runHandlerList(`${name}.${loopName}[${index}]`, flatSteps, ctx, innerAcc);
        if (r.lastStepName) loopLastStepName = r.lastStepName;
      }
      delete ctx[loopName];
      for (const [k, v] of Object.entries(innerAcc)) {
        ctx[k] = v;
        if (loopAcc) {
          if (!loopAcc[k]) loopAcc[k] = [];
          loopAcc[k].push(v);
        }
      }
      last = loopLastStepName ? innerAcc[loopLastStepName] ?? [] : [];
      if (loopLastStepName) lastStepName = loopLastStepName;
    } else if (handler !== null && typeof handler === "object" && StepRuntime in (handler as object)) {
      lastCond = null;
      const { name: stepName, handler: fn } = (handler as StepEntry)[StepRuntime];
      recordStep(stepName, yield* runStep(`${name}.${stepName}`, fn, ctx));
    } else if (handler instanceof AsyncGeneratorFunction) {
      lastCond = null;
      last = yield* (handler as (this: typeof ctx) => AsyncGenerator<unknown, unknown>).call(ctx);
    } else if (typeof handler === "function") {
      lastCond = null;
      last = await (handler as (this: typeof ctx) => unknown).call(ctx);
      if (last !== null && typeof last === "object" && SignalTag in (last as object)) yield last;
    }
  }

  return { last, lastStepName, lastCond };
}

export async function* runAction(name: string, scope: Scope, handlers: unknown[]): AsyncGenerator<unknown, unknown> {
  const ctx: Record<string | symbol, unknown> = { ...scope };

  yield { ">": name, input: scope.input };

  try {
    const r = yield* runHandlerList(name, handlers, ctx, null);
    yield { ">": name, result: r.last };
    return r.last;
  } catch (error) {
    yield { ">": name, error };
    throw error;
  }
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
