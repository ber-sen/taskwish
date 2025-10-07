import { Type, type } from "arktype";

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

  export interface Extendable<Scope> {
    use<const NewScope>(newScope: NewScope): Extendable<NewScope & Scope>;
  }

  export interface Describable<Scope extends Record<any, any>> {
    describe(
      description: string,
      meta?: { input: Scope["input"] }
    ): Scoped<Scope>;
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

  export interface Exception<
    Params extends {
      status: number;
    }
  > {
    exception: Params;
    throw: () => void;
    toString: () => string;
  }

  export interface Meta<
    Params extends {
      type: string;
    }
  > {
    meta: Params;
    toString: () => string;
  }
}
