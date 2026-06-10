import {
  Apply,
  Append,
  ValidateTrigger,
  InferTriggerScope,
  Pretty,
  CamelCase,
  AddActionsToCtx,
  DeepWriteable,
} from "../helpers";
import type { Steps, ActionResultKind } from "../steps";
import { TW } from "../core";
import {
  dispatch,
  LogFn,
  type ConsoleLike,
  type LoggerConfig,
  type InferTypeConfig,
} from "../use";
import { ActionMeta, ValidateActionMeta } from "./meta";

type AppendPlugin<Ctx extends Record<any, any>, Plugin> = {
  name: Ctx["name"];
  service: Ctx["service"];
  steps: Ctx["steps"];
  scope: Ctx["scope"];
  last: Ctx["last"];
  plugins: Append<Ctx["plugins"], Plugin>;
};

type ActionBody<
  Name extends string,
  Ctx extends Record<any, any>,
> = TW.Contextual<Ctx> & {
  use<const Config extends LoggerConfig>(
    config: Config,
  ): ActionBody<Name, AppendPlugin<Ctx, Config>>;
  use<const F extends string | undefined>(
    config: InferTypeConfig<F>,
  ): ActionBody<Name, AppendPlugin<Ctx, InferTypeConfig<F>>>;
  use<const U>(plugin: U): ActionBody<Name, AddActionsToCtx<Ctx, U>>;
  run: Steps<Ctx, ActionResultKind>;
};

type SignatureInput<
  Signature,
  Ctx extends Record<any, any>,
> = Signature extends (...args: any) => any
  ? Parameters<Signature>
  : Signature extends TW.Handler
    ? Parameters<Apply<Signature, Ctx>>
    : never;

type SignatureOutput<
  Signature,
  Ctx extends Record<any, any>,
> = Signature extends (...args: any) => any
  ? Awaited<ReturnType<Signature>>
  : Signature extends TW.Handler
    ? Awaited<ReturnType<Apply<Signature, Ctx>>>
    : never;

type SignatureMetaContext<Signature, Ctx extends Record<any, any>> = Omit<
  Ctx,
  "scope"
> & {
  scope: Pretty<Record<"input", SignatureInput<Signature, Ctx>> & Ctx["scope"]>;
};

type SignatureResult<
  Name extends string,
  Ctx extends Record<any, any>,
  Signature,
  Meta = null,
> = {
  [key in Name]: Signature extends (...args: any) => any
    ? TW.Action<
        "service" extends keyof Ctx ? `${Ctx["service"]}.${Name}` : Name,
        Signature,
        Meta
      >
    : Signature extends TW.Handler
      ? TW.Action<
          "service" extends keyof Ctx ? `${Ctx["service"]}.${Name}` : Name,
          Apply<Signature, Ctx>,
          Meta extends null
            ? Record<"handler", Signature>
            : Meta & Record<"handler", Signature>
        >
      : never;
} & {
  meta<
    const NextMeta extends ActionMeta<
      SignatureMetaContext<Signature, Ctx>,
      SignatureOutput<Signature, Ctx>
    >,
  >(
    meta: ValidateActionMeta<
      NextMeta,
      SignatureMetaContext<Signature, Ctx>,
      SignatureOutput<Signature, Ctx>
    >,
  ): SignatureResult<Name, Ctx, Signature, DeepWriteable<NextMeta>>;
};

type SignatureBody<
  Name extends string,
  Ctx extends Record<any, any>,
  Signature,
> = {
  use<const Config extends LoggerConfig>(
    config: Config,
  ): SignatureBody<Name, AppendPlugin<Ctx, Config>, Signature>;
  use<const F extends string | undefined>(
    config: InferTypeConfig<F>,
  ): SignatureBody<Name, AppendPlugin<Ctx, InferTypeConfig<F>>, Signature>;
  use<const U>(
    plugin: U,
  ): SignatureBody<Name, AddActionsToCtx<Ctx, U>, Signature>;
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
  ): SignatureResult<Name, Ctx, Signature>;
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
        generateText: (params: {
          model: "gpt5";
          prompt: string;
        }) => AsyncGenerator<
          TW.ActionInputEvent<
            TW.Action<
              "generateText",
              (params: { model: "gpt5"; prompt: string }) => string
            >,
            {
              model: "gpt5";
              prompt: string;
            }
          >,
          Promise<string>,
          unknown
        >;
      };
    };
    steps: [];
    plugins: [];
  },
> {
  use<const Config extends LoggerConfig>(
    config: Config,
  ): ActionFactory<Name, AppendPlugin<Ctx, Config>>;
  use<const F extends string | undefined>(
    config: InferTypeConfig<F>,
  ): ActionFactory<Name, AppendPlugin<Ctx, InferTypeConfig<F>>>;
  use<const U>(plugin: U): ActionFactory<Name, AddActionsToCtx<Ctx, U>>;
  sig<
    const Schema extends ((...args: any) => any) | TW.Handler,
  >(): SignatureBody<Name, Ctx, Schema>;
  input<const Schema>(trigger?: ValidateTrigger<Schema>): Schema extends
    | ((...args: any) => any)
    | TW.Handler
    ? SignatureBody<Name, Ctx, Schema>
    : ActionBody<
        Name,
        {
          name: Ctx["name"];
          service: Ctx["service"];
          scope: InferTriggerScope<Schema> & Ctx["scope"];
          [TW.Step]: {
            name: "launchApp" | StepName;
            map: { launchApp: string };
          };
          steps: [];
          plugins: Ctx["plugins"];
          meta: "meta" extends keyof Ctx ? Ctx["meta"] : null;
        }
      >;
  run: Steps<Ctx, ActionResultKind>;
}

const AsyncGeneratorFunction = async function* () {}.constructor as Function;

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

export type Scope = {
  input: unknown;
  get<T>(Cls: abstract new (...a: unknown[]) => T): T;
  signal(type: string, data: Record<string, unknown>): object;
};

const SignalTag = Symbol.for("TW.Signal");
export const ActionEventTag = Symbol.for("TW.ActionEvent");

// ── InferType action-step probe ───────────────────────────────────────────────

/** Sentinel property set on the fake return value inside `probeForActionCall`. */
const InferTypeActionCallTag = Symbol.for("TW.InferTypeActionCall");

type ActionCallCapture = { name: string; params: Record<string, unknown> };

/**
 * Infinite-depth proxy that tracks the property-access path.
 * In a string context (template literal) it yields `"@{path}"` so that
 * dynamic params like `` `hello ${this.input.name}` `` are captured as
 * `"hello @{input.name}"`.  In a numeric context it yields `0` so that
 * comparisons like `this.gent.length > 2` don't throw.
 */
function makeRecursiveProxy(path: string = ""): unknown {
  return new Proxy(function () {}, {
    get(_, prop) {
      if (prop === Symbol.toPrimitive) {
        return (hint: string) => (hint === "string" && path ? `@{${path}}` : 0);
      }
      if (prop === "valueOf") return () => 0;
      if (prop === "toString") return () => (path ? `@{${path}}` : "");
      const next = path ? `${path}.${String(prop)}` : String(prop);
      return makeRecursiveProxy(next);
    },
    apply() {
      return makeRecursiveProxy(path);
    },
  });
}

/**
 * Calls `fn` in a probe context where `this.actions.<name>(params)` is
 * intercepted.  Returns the captured action name + params, or `null` if the
 * handler isn't a direct action call.
 */
function probeForActionCall(fn: Function): ActionCallCapture | null {
  let captured: ActionCallCapture | null = null;

  const actionsProxy = new Proxy(
    {},
    {
      get(_, prop) {
        return (params: unknown) => {
          captured = {
            name: String(prop),
            params:
              params !== null && typeof params === "object"
                ? (params as Record<string, unknown>)
                : {},
          };
          const sentinel = Object.create(null);
          Object.defineProperty(sentinel, InferTypeActionCallTag, {
            value: true,
            enumerable: false,
          });
          return sentinel;
        };
      },
    },
  );

  const ctx = new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === "actions") return actionsProxy;
        return makeRecursiveProxy(String(prop));
      },
    },
  );

  try {
    const ret = fn.call(ctx);
    if (
      captured !== null &&
      ret !== null &&
      typeof ret === "object" &&
      InferTypeActionCallTag in (ret as object)
    ) {
      return captured;
    }
  } catch {
    // handler threw before/after the action call — treat as ScriptStep
  }

  return null;
}

/** Marks an AsyncGenerator returned by `self(input)` so runStep can yield* it directly. */
const SelfTag = Symbol.for("TW.SelfCall");

/** Set on ctx by the self() closure so runHandlerList can promote its name after the step. */
const SelfCalledTag = Symbol.for("TW.SelfCalled");

function actionEvent(obj: Record<string, unknown>) {
  return Object.defineProperty(obj, ActionEventTag, {
    value: true,
    enumerable: false,
  });
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
      if (
        ret !== null &&
        typeof ret === "object" &&
        SelfTag in (ret as object)
      ) {
        return yield* ret as AsyncGenerator<unknown, unknown>;
      }
      result = await ret;
    }
    if (
      result !== null &&
      typeof result === "object" &&
      SignalTag in (result as object)
    ) {
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
type ParallelEntry = { steps: unknown[] };

function twType(handler: unknown): string | null {
  return handler !== null && typeof handler === "object"
    ? (((handler as any)[TW.Type] as string | undefined) ?? null)
    : null;
}

async function evalCond(
  condition: unknown,
  ctx: Record<string | symbol, unknown>,
): Promise<boolean> {
  const val =
    typeof condition === "function"
      ? await (condition as (scope: unknown) => unknown).call(ctx, ctx)
      : twType(condition) === "Cond"
        ? await ((condition as any).fn as (scope: unknown) => unknown).call(
            ctx,
            ctx,
          )
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
): AsyncGenerator<
  unknown,
  { last: unknown; lastStepName: string | null; lastCond: boolean | null }
> {
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
      const isCondNode = twType(condition) === "Cond";
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
        adopt(
          yield* runHandlerList(
            branchName,
            steps as unknown[],
            ctx,
            loopAcc,
            transparent,
            actionName,
            actionHandlers,
          ),
        );
      }
    } else if (type === "ElseIf") {
      if (lastCond === false) {
        const { condition, steps } = handler as IfEntry;
        const isCondNode = twType(condition) === "Cond";
        let condRaw: unknown;
        if (isCondNode) {
          condRaw = await ((condition as any).fn as Function).call(ctx, ctx);
          lastCond = Boolean(condRaw);
        } else {
          lastCond = await evalCond(condition, ctx);
        }

        if (lastCond) {
          if (isCondNode) ctx["condition"] = condRaw;
          const branchName = transparent
            ? currentName
            : `${currentName}.elseIf`;
          adopt(
            yield* runHandlerList(
              branchName,
              steps as unknown[],
              ctx,
              loopAcc,
              transparent,
              actionName,
              actionHandlers,
            ),
          );
        }
      }
    } else if (type === "Else") {
      if (lastCond === false) {
        const branchName = transparent ? currentName : `${currentName}.else`;
        adopt(
          yield* runHandlerList(
            branchName,
            (handler as ElseEntry).steps as unknown[],
            ctx,
            loopAcc,
            transparent,
            actionName,
            actionHandlers,
          ),
        );
      }
      lastCond = null;
    } else if (type === "Loop") {
      lastCond = null;
      const {
        name: loopName,
        items: itemsGetter,
        steps,
      } = handler as LoopEntry;
      const items =
        typeof itemsGetter === "function"
          ? await (itemsGetter as (scope: unknown) => unknown).call(ctx, ctx)
          : twType(itemsGetter) === "ForEach"
            ? await (
                (itemsGetter as any).fn as (scope: unknown) => unknown
              ).call(ctx, ctx)
            : typeof itemsGetter === "string"
              ? (itemsGetter as string)
                  .split(".")
                  .reduce((o: any, k) => o?.[k], ctx)
              : itemsGetter;
      yield { ">": `${currentName}.${loopName}`, items };
      const innerAcc: Record<string, unknown[]> = {};
      let loopLastStepName: string | null = null;
      const loopIterLasts: unknown[] = [];
      const flatSteps = steps as unknown[];
      for (let index = 0; index < (items as unknown[]).length; index++) {
        ctx[loopName] = { item: (items as unknown[])[index], index };
        const r = yield* runHandlerList(
          `${currentName}.${loopName}[${index}]`,
          flatSteps,
          ctx,
          innerAcc,
          transparent,
          actionName,
          actionHandlers,
        );
        if (r.lastStepName) loopLastStepName = r.lastStepName;
        loopIterLasts.push(r.last);
      }
      delete ctx[loopName];
      for (const [k, v] of Object.entries(innerAcc)) {
        ctx[k] = v;
        if (loopAcc) {
          if (!loopAcc[k]) loopAcc[k] = [];
          loopAcc[k].push(v);
        }
      }
      if (loopLastStepName !== null) {
        last = innerAcc[loopLastStepName] ?? [];
        lastStepName = loopLastStepName;
      } else {
        // Non-step last per iteration (e.g. Parallel as final handler in loop body)
        const hasDirectLast = loopIterLasts.some((v) => v !== undefined);
        last = hasDirectLast ? loopIterLasts : [];
      }
    } else if (type === "Parallel") {
      lastCond = null;
      const { steps: parallelSteps } = handler as ParallelEntry;

      // Run each step concurrently in an independent snapshot of ctx.
      // Using runHandlerList (single-step) so that `self` injection and other
      // machinery work identically to sequential steps.
      const stepResults = await Promise.all(
        parallelSteps.map(async (step) => {
          const stepCtx = { ...ctx };
          const events: unknown[] = [];

          const gen = runHandlerList(
            currentName,
            [step],
            stepCtx,
            null,
            transparent,
            actionName,
            actionHandlers,
          );

          let iterResult: {
            last: unknown;
            lastStepName: string | null;
            lastCond: boolean | null;
          } = { last: undefined, lastStepName: null, lastCond: null };

          let item = await gen.next();
          while (!item.done) {
            events.push(item.value);
            item = await gen.next();
          }
          iterResult = item.value as typeof iterResult;

          return {
            events,
            last: iterResult.last,
            stepName: iterResult.lastStepName,
          };
        }),
      );

      // Yield all step events in declaration order (deterministic)
      for (const { events } of stepResults) {
        for (const event of events) yield event;
      }

      // Merge results into outer ctx and build parallel-last object
      const parallelLast: Record<string, unknown> = {};
      for (const { stepName, last: stepLast } of stepResults) {
        if (stepName === null) continue;
        ctx[stepName] = stepLast;
        parallelLast[stepName] = stepLast;
        if (loopAcc) {
          if (!loopAcc[stepName]) loopAcc[stepName] = [];
          loopAcc[stepName].push(stepLast);
        }
      }

      last = parallelLast;
      // Explicitly null so the loop handler falls through to loopIterLasts tracking
      lastStepName = null;
    } else if (
      (typeof handler === "function" || Array.isArray(handler)) &&
      TW.Name in Object(handler)
    ) {
      lastCond = null;
      const stepName = (handler as any)[TW.Name] as string;
      const fn = Array.isArray(handler)
        ? ((handler as unknown[])[0] as (...a: unknown[]) => unknown)
        : (handler as (...a: unknown[]) => unknown);

      // Inject `this.self` so the step can recursively re-invoke the action.
      // The self-call name is `actionName.stepName` (e.g. "factorial.next"),
      // and runs in transparent mode so if/else branches don't add prefix segments.
      const _actionName = actionName;
      const _stepName = stepName;
      const _actionHandlers = actionHandlers;
      ctx["self"] = (input: unknown) => {
        ctx[SelfCalledTag] = true;
        const gen = runAction(
          `${_actionName}.${_stepName}`,
          buildScope("first", [input]),
          _actionHandlers,
          true,
        );
        Object.defineProperty(gen, SelfTag, { value: true, enumerable: false });
        return gen;
      };

      recordStep(
        stepName,
        yield* runStep(`${currentName}.${stepName}`, fn, ctx),
      );

      // If this step called self, promote currentName back to actionName so that
      // subsequent steps in the same branch use the action name as their prefix
      // (e.g. "factorial.multiply" rather than "factorial.else.multiply").
      if (ctx[SelfCalledTag]) {
        currentName = actionName;
        delete ctx[SelfCalledTag];
      }
    } else if (handler instanceof AsyncGeneratorFunction) {
      lastCond = null;
      last = yield* (
        handler as (this: typeof ctx) => AsyncGenerator<unknown, unknown>
      ).call(ctx);
    } else if (typeof handler === "function") {
      lastCond = null;
      last = await (handler as (this: typeof ctx) => unknown).call(ctx);
      if (
        last !== null &&
        typeof last === "object" &&
        SignalTag in (last as object)
      )
        yield last;
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
    const r = yield* runHandlerList(
      name,
      handlers,
      ctx,
      null,
      transparent,
      name,
      handlers,
    );
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
      Object.defineProperty(event, SignalTag, {
        value: true,
        enumerable: false,
      });
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
  let inferType = false;
  let inferTypeFilter: string | undefined = undefined;
  const injectedActions: Record<string, unknown> = {};
  const pendingPlugins: Promise<void>[] = [];
  let actionMeta: unknown = null;

  function tap<G extends AsyncGenerator<unknown, unknown>>(gen: G): G {
    return tapWith(gen, dispatch(logger)) as G;
  }

  function detectPlugin(config: LoggerConfig | InferTypeConfig<any>) {
    if ((config as any)[TW.Type] === "InferType") {
      inferType = true;
      inferTypeFilter = (config as InferTypeConfig<any>).filter;
    } else {
      logger = (config as LoggerConfig).target;
    }
  }

  function injectAction(plugin: unknown) {
    const fullName: unknown = (plugin as any)[TW.Name];
    if (typeof fullName !== "string") return;
    const dot = fullName.indexOf(".");
    if (dot === -1) {
      // Flat name: store directly — this.actions.notify
      injectedActions[fullName] = plugin;
    } else {
      // Dotted name: store nested — this.actions.notifier.notify
      const rawService = fullName.slice(0, dot);
      const service = rawService.charAt(0).toLowerCase() + rawService.slice(1);
      const method = fullName.slice(dot + 1);
      injectedActions[service] = {
        ...(injectedActions[service] as Record<string, unknown> | undefined),
        [method]: plugin,
      };
    }
  }

  function injectActions(plugin: unknown) {
    if (typeof plugin === "function") {
      injectAction(plugin);
      return;
    }

    if (plugin === null || typeof plugin !== "object") return;
    if ("then" in (plugin as object)) {
      pendingPlugins.push(Promise.resolve(plugin).then(injectActions));
      return;
    }

    for (const value of Object.values(plugin as Record<string, unknown>)) {
      if (typeof value === "function") injectAction(value);
    }
  }

  function usePlugin(config: unknown) {
    const type =
      config !== null && typeof config === "object"
        ? (config as any)[TW.Type]
        : undefined;
    if (type === "Logger" || type === "InferType") {
      detectPlugin(config as LoggerConfig | InferTypeConfig);
    } else {
      injectActions(config);
    }
  }

  async function buildExtra() {
    if (pendingPlugins.length > 0) await Promise.all(pendingPlugins);

    return Object.keys(injectedActions).length > 0
      ? { actions: { ...injectedActions } }
      : {};
  }

  function createAction(inputMode: "first" | "args", handlers: unknown[]) {
    if (inferType) {
      const steps: Array<Record<string, unknown>> = [];
      for (const handler of handlers) {
        if (
          handler !== null &&
          handler !== undefined &&
          TW.Name in Object(handler)
        ) {
          const stepName = (handler as any)[TW.Name] as string;
          const fn = Array.isArray(handler) ? (handler as any[])[0] : handler;
          const actionCall = probeForActionCall(fn as Function);
          if (actionCall) {
            steps.push({
              $: actionCall.name,
              "=": stepName,
              ...actionCall.params,
            });
          } else {
            steps.push({
              $: "step",
              "=": stepName,
              run: `@{${(fn as Function).toString().replace(/^\s+/gm, "")}}`,
            });
          }
        }
      }
      if (inferTypeFilter !== undefined) {
        const filtered = steps.find((s) => s["="] === inferTypeFilter);
        return { [actionName]: filtered };
      }

      return { [actionName]: { ">": "Command", "=": actionName, run: steps } };
    }

    async function consume(...args: unknown[]) {
      const extra = await buildExtra();
      const gen = tap(
        runAction(actionName, buildScope(inputMode, args, extra), handlers),
      );
      let item = await gen.next();
      while (!item.done) item = await gen.next();
      return item.value;
    }

    async function* rawStream(...args: unknown[]) {
      const extra = await buildExtra();
      yield* runAction(
        actionName,
        buildScope(inputMode, args, extra),
        handlers,
      );
    }

    function stream(...args: unknown[]) {
      return tap(rawStream(...args));
    }

    const action = Object.assign(consume, {
      [TW.Name]: actionName,
      [TW.Meta]: actionMeta,
      stream,
    });
    const result = {
      [actionName]: action,
      meta(meta: Record<string, unknown>) {
        actionMeta = {
          ...(actionMeta !== null && typeof actionMeta === "object"
            ? actionMeta
            : {}),
          ...meta,
        };
        action[TW.Meta] = actionMeta;
        return result;
      },
    };

    return result;
  }

  const makeBody = (inputMode: "first" | "args") => ({
    use(config: unknown) {
      usePlugin(config);
      return this;
    },
    run(...handlers: unknown[]) {
      return createAction(inputMode, handlers);
    },
  });

  return {
    sig() {
      return makeBody("args");
    },
    input(_schema?: unknown) {
      return makeBody("first");
    },
    use(config: unknown) {
      usePlugin(config);
      return this;
    },
    run(...handlers: unknown[]) {
      return createAction("first", handlers);
    },
  } as any;
}
