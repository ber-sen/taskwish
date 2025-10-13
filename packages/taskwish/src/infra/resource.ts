import { TaskWish } from "../types";

interface ResourceFactory<
  Name extends string,
  Params extends Object,
  Result,
  Stream,
  Ctx = TaskWish.DefaultCtx
> extends TaskWish.Namable<Name> {
  (params: Params): TaskWish.Resource<Name, Result, Stream, Ctx>;
}

export function Resource<
  Name extends string,
  Params extends Object,
  Stream,
  Result,
  Ctx = TaskWish.DefaultCtx
>(
  name: Name,
  on: (
    params: Params,
    state: "up" | "down",
    ctx?: Ctx
  ) => Result | Promise<Result> | AsyncGenerator<Stream, Result, Ctx>
): ResourceFactory<Name, Params, Result, Stream, Ctx> {
  const resource = (params: Params) => ({
    name,
    up: async (ctx?: Ctx) => on(params, "up", ctx) as never,
    down: async (ctx?: Ctx) => on(params, "down", ctx) as never,
    stream: (state: "up" | "down", ctx?: Ctx) =>
      on(params, state, ctx) as never,
  });

  resource.name = name;

  return resource;
}
