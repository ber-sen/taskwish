import { JsonSchema, Type, type } from "arktype";

export namespace TaskWish {
  export interface Named<Name extends string> {
    name: Name;
  }
  export interface RunCtx {
    abortSignal?: AbortSignal;
  }
  export interface RunnableCtx {
    abortSignal?: AbortSignal;
  }
  export interface InfraCtx {
    abortSignal?: AbortSignal;
  }
  export interface ToolCtx {
    abortSignal?: AbortSignal;
  }
  export interface Runnable<Stream, Result, Ctx = RunCtx> {
    run(ctx?: Ctx): Promise<Result>;
    stream(ctx?: Ctx): AsyncGenerator<Stream, Result, Ctx>;
  }
  export interface Action<Params extends Object, Stream, Result, Ctx = RunCtx> {
    run(params: Params, ctx?: Ctx): Promise<Result>;
    stream(params: Params, ctx?: Ctx): AsyncGenerator<Stream, Result, Ctx>;
  }
  export interface Scoped<Scope extends Record<any, any>> {
    scope: Scope;
  }

  export interface Tool {
    name: string;
    description?: string;
    inputSchema: JsonSchema;
    outputSchema?: JsonSchema;
    handler: (args: unknown, ctx: ToolCtx) => Promise<unknown>;
  }

  export interface Resource<Params extends Object, Result, Ctx = InfraCtx> {
    (params: Params): {
      up(
        ctx?: Ctx
      ): Promise<Exclude<Awaited<Result>, undefined | Meta<"destroy", any>>>;
      down(
        ctx?: Ctx
      ): Promise<Result extends Meta<"destroy", infer D> ? D : never>;
    };
  }

  export interface Extendable<Scope> {
    use<const NewScope>(newScope: NewScope): Extendable<NewScope & Scope>;
  }

  export interface Describable<Scope extends Record<any, any>> {
    describe(
      description: string,
      meta?: { input: Scope["input"] }
    ): Scoped<Scope>;
  }

  export interface StepOption<T extends string, G extends null | string> {
    stepOptionType: T;
    group: G;
    params?: object;
  }

  export interface Triggerable<Scope extends Record<any, any>> {
    on<const Schema>(
      on: Schema extends Type<infer Schema>
        ? Type<Schema>
        : Schema extends object
        ? type.validate<Schema>
        : object
    ): Scoped<Scope>;
  }

  export interface Exception<Status, Params> {
    status: Status;
    exception: Params;
    throw: () => void;
    toString: () => string;
  }

  export interface Meta<Type extends string, Params> {
    type: Type;
    meta: Params;
    toString: () => string;
  }
}
