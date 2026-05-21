import {
  Apply,
  ValidateTrigger,
  InferTriggerScope,
  Pretty,
  CamelCase,
} from "../helpers";
import type { Steps, ActionResultKind } from "../steps";
import { TW } from "../core";
import { dispatch, LogFn, type ConsoleLike, type LoggerConfig } from "../use";

type ActionBody<
  Name extends string,
  Ctx extends Record<any, any>,
> = TW.Contextual<Ctx> & {
  use(config: LoggerConfig): ActionBody<Name, Ctx>;
  run: Steps<Ctx, ActionResultKind>;
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
  run: Steps<Ctx, ActionResultKind>;
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

export type Scope = { input: unknown; get<T>(Cls: abstract new (...a: unknown[]) => T): T; signal(type: string, data: Record<string, unknown>): object };

const SignalTag = Symbol.for("TW.Signal");
export const ActionEventTag = Symbol.for("TW.ActionEvent");

/** Marks an AsyncGenerator returned by `self(input)` so runStep can yield* it directly. */
const SelfTag = Symbol.for("TW.SelfCall");

/** Set on ctx by the self() closure so runHandlerList can promote its name after the step. */
const SelfCalledTag = Symbol.for("TW.SelfCalled");

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
      const ret = handler.call(ctx);
      // If the step returned a self-recursive generator, propagate its events
      // and return its result without emitting a step result event for this step.
      if (ret !== null && typeof ret === "object" && SelfTag in (ret as object)) {
        return yield* ret as AsyncGenerator<unknown, unknown>;
      }
      result = await ret;
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
  /** When true (self-recursive calls), if/else/elseIf branches don't add a prefix segment. */
  transparent: boolean = false,
  /** The top-level action name for this invocation; used to name self-call generators. */
  actionName: string = name,
  /** The top-level handlers for this invocation; passed to self-recursive runAction calls. */
  actionHandlers: unknown[] = handlers,
): AsyncGenerator<unknown, { last: unknown; lastStepName: string | null; lastCond: boolean | null }> {
  // `currentName` can be promoted from a branch name (e.g. "factorial.else") back to the
  // action name ("factorial") after a step calls `self`, so that subsequent steps in the
  // same branch are named relative to the action rather than the branch.
  let currentName = name;
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
        const branchName = transparent ? currentName : `${currentName}.if`;
        adopt(yield* runHandlerList(branchName, steps as unknown[], ctx, loopAcc, transparent, actionName, actionHandlers));
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
          const branchName = transparent ? currentName : `${currentName}.elseIf`;
          adopt(yield* runHandlerList(branchName, steps as unknown[], ctx, loopAcc, transparent, actionName, actionHandlers));
        }
      }
    } else if (type === "Else") {
      if (lastCond === false) {
        const branchName = transparent ? currentName : `${currentName}.else`;
        adopt(yield* runHandlerList(branchName, (handler as ElseEntry).steps as unknown[], ctx, loopAcc, transparent, actionName, actionHandlers));
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
      yield { ">": `${currentName}.${loopName}`, items };
      const innerAcc: Record<string, unknown[]> = {};
      let loopLastStepName: string | null = null;
      const flatSteps = steps as unknown[];
      for (let index = 0; index < (items as unknown[]).length; index++) {
        ctx[loopName] = { item: (items as unknown[])[index], index };
        const r = yield* runHandlerList(`${currentName}.${loopName}[${index}]`, flatSteps, ctx, innerAcc, transparent, actionName, actionHandlers);
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
    } else if ((typeof handler === "function" || Array.isArray(handler)) && TW.Name in Object(handler)) {
      lastCond = null;
      const stepName = (handler as any)[TW.Name] as string;
      const fn = Array.isArray(handler)
        ? (handler as unknown[])[0] as (...a: unknown[]) => unknown
        : handler as (...a: unknown[]) => unknown;

      // Inject `this.self` so the step can recursively re-invoke the action.
      // The self-call name is `actionName.stepName` (e.g. "factorial.next"),
      // and runs in transparent mode so if/else branches don't add prefix segments.
      const _actionName = actionName;
      const _stepName = stepName;
      const _actionHandlers = actionHandlers;
      ctx["self"] = (input: unknown) => {
        ctx[SelfCalledTag] = true;
        const gen = runAction(`${_actionName}.${_stepName}`, buildScope("first", [input]), _actionHandlers, true);
        Object.defineProperty(gen, SelfTag, { value: true, enumerable: false });
        return gen;
      };

      recordStep(stepName, yield* runStep(`${currentName}.${stepName}`, fn, ctx));

      // If this step called self, promote currentName back to actionName so that
      // subsequent steps in the same branch use the action name as their prefix
      // (e.g. "factorial.multiply" rather than "factorial.else.multiply").
      if (ctx[SelfCalledTag]) {
        currentName = actionName;
        delete ctx[SelfCalledTag];
      }
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

export async function* runAction(
  name: string,
  scope: Scope,
  handlers: unknown[],
  /** When true (self-recursive calls), if/else/elseIf branches don't add prefix segments. */
  transparent: boolean = false,
): AsyncGenerator<unknown, unknown> {
  const ctx: Record<string | symbol, unknown> = { ...scope };

  yield { ">": name, input: scope.input };

  try {
    const r = yield* runHandlerList(name, handlers, ctx, null, transparent, name, handlers);
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
    use(config: unknown) { detectLogger(config as LoggerConfig); return this; },
    run(...handlers: unknown[]) {
      return createAction(inputMode, handlers);
    },
  });

  return {
    sig() { return makeBody("args"); },
    input(_schema?: unknown) { return makeBody("first"); },
    use(config: unknown) { detectLogger(config as LoggerConfig); return this; },
    run(...handlers: unknown[]) {
      return createAction("first", handlers);
    },
  } as any
}
