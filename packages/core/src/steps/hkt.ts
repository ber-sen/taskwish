import { TW } from "../core";

// ── Result kind ───────────────────────────────────────────────────────────────

/**
 * Base interface for "result kinds" — HKT from (Ctx, Last) to a concrete
 * return type.
 */
export interface ResultKind {
  readonly ctx: unknown;
  readonly last: unknown;
  readonly type: unknown;
}

/** Instantiate a ResultKind with concrete (Ctx, Last). */
export type ApplyResult<F extends ResultKind, Ctx, Last> =
  (F & { readonly ctx: Ctx; readonly last: Last })["type"];

// ── Chain function builder ────────────────────────────────────────────────────

/**
 * Call signatures for 1–3 steps → result.
 *
 * - `ChainFn<RK>`               — step 1 is a plain step; Ctx flows in directly
 * - `ChainFn<RK, "ForEach">`    — step 1 must carry `[TW.Type]: "ForEach"`
 *
 * When `OptionsType` is provided it is added as `[TW.Type]: OptionsType` on the
 * first step's shape; the remaining steps are always plain steps.
 */
export type ChainFn<RK extends ResultKind, OptionsType extends string = never> = {
  // 1 step
  <
    Ctx extends Record<any, any>,
    A extends Record<any, any>,
  >(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx) => A }
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx) => A },
  ): ApplyResult<RK, Ctx, A>;

  // 2 steps
  <
    Ctx extends Record<any, any>,
    A extends Record<any, any>,
    B extends Record<any, any>,
  >(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx) => A }
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx) => A },
    step2: { [TW.Step]: (input: A) => B },
  ): ApplyResult<RK, Ctx, B>;

  // 3 steps
  <
    Ctx extends Record<any, any>,
    A extends Record<any, any>,
    B extends Record<any, any>,
    C extends Record<any, any>,
  >(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx) => A }
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx) => A },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
  ): ApplyResult<RK, Ctx, C>;

  // 4 steps
  <
    Ctx extends Record<any, any>,
    A extends Record<any, any>,
    B extends Record<any, any>,
    C extends Record<any, any>,
    D extends Record<any, any>,
  >(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx) => A }
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx) => A },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
  ): ApplyResult<RK, Ctx, D>;
};
