import { TaskWish } from "../types";

export function Resource<
  Params extends Object,
  Result,
  Ctx = TaskWish.InfraCtx
>(
  on: ((params: Params, state: "up", ctx?: Ctx) => Result | Promise<Result>) &
    ((params: Params, state: "down", ctx?: Ctx) => Result | Promise<Result>)
): TaskWish.Resource<Params, Result, Ctx> {
  return (params) => ({
    up: async (ctx) => on(params, "up", ctx) as never,
    down: async (ctx) => on(params, "down", ctx) as never,
  }) ;
}
