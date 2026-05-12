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

type ActionBody<
  Name extends string,
  Ctx extends Record<any, any>,
> = TW.Contextual<Ctx> & {
  use<const NewScope>(newScope: NewScope): ActionBody<Name, Ctx>;
  run: Steps<Ctx>;
};

type SignatureBody<
  Name extends string,
  Ctx extends Record<any, any>,
  Signature,
> = {
  use<const NewScope>(newScope: NewScope): SignatureBody<Name, Ctx, Signature>;
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
      signal: (type: string, event: any) => TW.Event<any, any>;
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

type StepEntry = Record<typeof StepRuntime, { name: string; handler: (...a: unknown[]) => unknown }>;
type Scope = { input: unknown; get<T>(Cls: abstract new (...a: unknown[]) => T): T };


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
    yield { $: "step", name, result };

    return result;
  } catch (error) {
    yield { $: "step", name, error };
    
    throw error;
  }
}

async function* runCore(name: string, scope: Scope, handlers: unknown[]): AsyncGenerator<unknown, unknown> {
  let ctx: Record<string | symbol, unknown> = { ...scope };
  let last: unknown;

  yield { $: "action", name, input: scope.input };

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
        yield last;
      }
    }
  } catch (error) {
    yield { $: "action", name, error };
    throw error;
  }

  yield { $: "action", name, result: last };
  return last;
}

export function Action<const Name extends string>(
  name: CamelCase<Name>,
): ActionFactory<Name> {
  const actionName = name as string;

  function buildScope(inputMode: "first" | "args", args: unknown[]): Scope {
    const registry = new Map<unknown, unknown>();
    return {
      input: inputMode === "args" ? args : args[0],
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

  function createAction(inputMode: "first" | "args", handlers: unknown[]) {
    async function consume(...args: unknown[]) {
      const gen = runCore(actionName, buildScope(inputMode, args), handlers);
      let item = await gen.next();
      while (!item.done) item = await gen.next();
      return item.value;
    }

    function stream(...args: unknown[]) {
      return runCore(actionName, buildScope(inputMode, args), handlers);
    }

    return { [actionName]: Object.assign(consume, { stream }) };
  }

  const makeBody = (inputMode: "first" | "args") => ({
    use() { return this; },
    run(...handlers: unknown[]) {
      return createAction(inputMode, handlers);
    },
  });

  return {
    sig() { return makeBody("args"); },
    input(_schema?: unknown) { return makeBody("first"); },
    use() { return this; },
    run(...handlers: unknown[]) {
      return createAction("first", handlers);
    },
  } as any
}
