import { Type, type } from "arktype";

export namespace TaskWish {
  export interface Runnable<Stream, Result, Ctx> {
    run(): Promise<Result>;
    stream(): AsyncGenerator<Stream, Result, Ctx>;
  }
  export interface Action<Params extends Object, Stream, Result, Ctx> {
    run(params: Params): Promise<Result>;
    stream(params: Params): AsyncGenerator<Stream, Result, Ctx>;
  }
  export interface Scoped<Scope extends Record<any, any>> {
    scope: Scope;
  }

  export interface Extendable<Scope> {
    use<const NewScope>(newScope: NewScope): Extendable<NewScope & Scope>;
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
