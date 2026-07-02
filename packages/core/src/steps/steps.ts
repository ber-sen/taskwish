import { TW } from "../core";
import {
  DeepWriteable,
  FindInferTypeFilter,
  Pretty,
  PrettyScope,
  QualifiedActionName,
  ResolveLast,
  ResolveScope,
} from "../helpers";
import type {
  ActionMeta,
  ValidateActionMeta,
} from "../action/meta";
import { ResultKind, ApplyResult } from "./hkt";

export const SubSteps = Symbol.for("SubSteps");

type FirstDefined<T extends readonly unknown[]> =
  T extends [infer Head, ...infer Tail]
    ? Head extends undefined
      ? FirstDefined<Tail>
      : Head
    : never;

type UserScope<Ctx extends Record<any, any>> = TW.Scope<
  PrettyScope<ResolveScope<Ctx["scope"]>>
>;

// ── FilterSteps ───────────────────────────────────────────────────────────────

/**
 * Maps a steps tuple so that only the element whose `"="` matches `Filter`
 * keeps its type; all others become `undefined`.
 */
type FilterSteps<S extends readonly any[], Filter extends string> = {
  [K in keyof S]: S[K] extends { "=": Filter } ? S[K] : undefined;
};

// ── Built-in result kinds ─────────────────────────────────────────────────────

/**
 * Used by `Steps<Ctx, ActionResultKind>` — the normal action mode that
 * produces a `TW.Action` callable.
 */
type ActionResult<Last> = "last" extends keyof Last
  ? ResolveLast<Last["last"]>
  : "steps" extends keyof Last
    ? Last["steps"]
    : Last;

type ActionMetadataOutput<Result> =
  Result extends AsyncGenerator<any, infer Return, any>
    ? Awaited<Return>
    : Result extends Generator<any, infer Return, any>
      ? Return
      : Awaited<Result>;

type MergeMeta<Current, Next> = [Current] extends [null]
  ? Next
  : Pretty<Current & Next>;

type RegularAction<
  Ctx extends Record<any, any>,
  Last,
  Meta = "meta" extends keyof Ctx ? DeepWriteable<Ctx["meta"]> : null,
> = {
  [name in Ctx["name"]]: TW.Action<
    Ctx extends { service: infer S extends string }
      ? QualifiedActionName<S, Ctx["name"]>
      : Ctx["name"],
    "scope" extends keyof Ctx
      ? "input" extends keyof Ctx["scope"]
        ? (
            input: "$call" extends keyof Ctx["scope"]
              ? Ctx["scope"]["$call"]
              : Ctx["scope"]["input"],
          ) => Promise<
            ActionResult<Last>
          >
        : () => Promise<ActionResult<Last>>
      : () => Promise<ActionResult<Last>>,
    Meta
  >;
} & {
  meta<
    const NextMeta extends ActionMeta<
      Ctx,
      ActionMetadataOutput<ActionResult<Last>>
    >,
  >(
    meta: ValidateActionMeta<
      NextMeta,
      Ctx,
      ActionMetadataOutput<ActionResult<Last>>
    >,
  ): RegularAction<Ctx, Last, DeepWriteable<MergeMeta<Meta, NextMeta>>>;
};

export interface ActionResultKind extends ResultKind {
  type: this["ctx"] extends Record<any, any>
    ? "name" extends keyof this["ctx"]
      ? this["ctx"]["name"] extends string
        ? FindInferTypeFilter<this["ctx"]["plugins"]> extends infer Filter
          ? [Filter] extends [never]
            ? RegularAction<this["ctx"], this["last"]>
            : this["last"] extends { steps: infer S }
              ? this["ctx"] extends { name: infer N extends string }
                ? Filter extends string
                  ? {
                      [Name in N]: FirstDefined<
                        FilterSteps<S extends readonly any[] ? S : [], Filter>
                      >;
                    }
                  : {
                      [Name in N]: {
                        "->": "Command";
                        "=": N;
                        run: S;
                      };
                    }
                : never
              : never
          : never
        : never
      : never
    : never;
}

/**
 * Used by `Steps<typeof SubSteps, SubStepsResultKind>` (e.g. `Parallel`) —
 * produces a sub-step `{ [TW.Step]: (input: Ctx) => Last }`.
 */
export interface SubStepsResultKind extends ResultKind {
  type: this["ctx"] extends infer Ctx
    ? this["last"] extends infer Last
      ? { [TW.Step]: (input: Ctx) => Last }
      : never
    : never;
}

// ── Steps interface ───────────────────────────────────────────────────────────

export interface Steps<
  Ctx extends Record<any, any> | typeof SubSteps,
  RK extends ResultKind,
  OptionsType extends string = never,
> {
  <SubCtx extends Record<any, any>, A>(
    step: [OptionsType] extends [never]
      ?
          | {
              [TW.Step]: (
                input: Ctx extends typeof SubSteps ? SubCtx : Ctx,
              ) => A;
            }
          | ((
              this: Ctx extends typeof SubSteps
                ? UserScope<SubCtx>
                : Ctx extends Record<any, any>
                  ? UserScope<Ctx>
                  : never,
            ) => A)
      : {
          [TW.Type]: OptionsType;
          [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
        },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, A>;
  <SubCtx, A, B>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : {
          [TW.Type]: OptionsType;
          [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
        },
    step2: { [TW.Step]: (input: A) => B },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, B>;
  <SubCtx, A, B, C>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : {
          [TW.Type]: OptionsType;
          [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
        },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, C>;
  <SubCtx, A, B, C, D>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : {
          [TW.Type]: OptionsType;
          [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
        },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, D>;
  <SubCtx, A, B, C, D, E>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : {
          [TW.Type]: OptionsType;
          [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
        },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
    step5: { [TW.Step]: (input: D) => E },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, E>;
  <SubCtx, A, B, C, D, E, F>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : {
          [TW.Type]: OptionsType;
          [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
        },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
    step5: { [TW.Step]: (input: D) => E },
    step6: { [TW.Step]: (input: E) => F },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, F>;
  <SubCtx, A, B, C, D, E, F, G>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : {
          [TW.Type]: OptionsType;
          [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
        },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
    step5: { [TW.Step]: (input: D) => E },
    step6: { [TW.Step]: (input: E) => F },
    step7: { [TW.Step]: (input: F) => G },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, G>;
  <SubCtx, A, B, C, D, E, F, G, H>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : {
          [TW.Type]: OptionsType;
          [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
        },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
    step5: { [TW.Step]: (input: D) => E },
    step6: { [TW.Step]: (input: E) => F },
    step7: { [TW.Step]: (input: F) => G },
    step8: { [TW.Step]: (input: G) => H },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, H>;
  <SubCtx, A, B, C, D, E, F, G, H, I>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : {
          [TW.Type]: OptionsType;
          [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
        },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
    step5: { [TW.Step]: (input: D) => E },
    step6: { [TW.Step]: (input: E) => F },
    step7: { [TW.Step]: (input: F) => G },
    step8: { [TW.Step]: (input: G) => H },
    step9: { [TW.Step]: (input: H) => I },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, I>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : {
          [TW.Type]: OptionsType;
          [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
        },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
    step5: { [TW.Step]: (input: D) => E },
    step6: { [TW.Step]: (input: E) => F },
    step7: { [TW.Step]: (input: F) => G },
    step8: { [TW.Step]: (input: G) => H },
    step9: { [TW.Step]: (input: H) => I },
    step10: { [TW.Step]: (input: I) => J },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, J>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : {
          [TW.Type]: OptionsType;
          [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
        },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
    step5: { [TW.Step]: (input: D) => E },
    step6: { [TW.Step]: (input: E) => F },
    step7: { [TW.Step]: (input: F) => G },
    step8: { [TW.Step]: (input: G) => H },
    step9: { [TW.Step]: (input: H) => I },
    step10: { [TW.Step]: (input: I) => J },
    step11: { [TW.Step]: (input: J) => K },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, K>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : {
          [TW.Type]: OptionsType;
          [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
        },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
    step5: { [TW.Step]: (input: D) => E },
    step6: { [TW.Step]: (input: E) => F },
    step7: { [TW.Step]: (input: F) => G },
    step8: { [TW.Step]: (input: G) => H },
    step9: { [TW.Step]: (input: H) => I },
    step10: { [TW.Step]: (input: I) => J },
    step11: { [TW.Step]: (input: J) => K },
    step12: { [TW.Step]: (input: K) => L },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, L>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : {
          [TW.Type]: OptionsType;
          [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
        },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
    step5: { [TW.Step]: (input: D) => E },
    step6: { [TW.Step]: (input: E) => F },
    step7: { [TW.Step]: (input: F) => G },
    step8: { [TW.Step]: (input: G) => H },
    step9: { [TW.Step]: (input: H) => I },
    step10: { [TW.Step]: (input: I) => J },
    step11: { [TW.Step]: (input: J) => K },
    step12: { [TW.Step]: (input: K) => L },
    step13: { [TW.Step]: (input: L) => M },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, M>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : {
          [TW.Type]: OptionsType;
          [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
        },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
    step5: { [TW.Step]: (input: D) => E },
    step6: { [TW.Step]: (input: E) => F },
    step7: { [TW.Step]: (input: F) => G },
    step8: { [TW.Step]: (input: G) => H },
    step9: { [TW.Step]: (input: H) => I },
    step10: { [TW.Step]: (input: I) => J },
    step11: { [TW.Step]: (input: J) => K },
    step12: { [TW.Step]: (input: K) => L },
    step13: { [TW.Step]: (input: L) => M },
    step14: { [TW.Step]: (input: M) => N },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, N>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : {
          [TW.Type]: OptionsType;
          [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
        },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
    step5: { [TW.Step]: (input: D) => E },
    step6: { [TW.Step]: (input: E) => F },
    step7: { [TW.Step]: (input: F) => G },
    step8: { [TW.Step]: (input: G) => H },
    step9: { [TW.Step]: (input: H) => I },
    step10: { [TW.Step]: (input: I) => J },
    step11: { [TW.Step]: (input: J) => K },
    step12: { [TW.Step]: (input: K) => L },
    step13: { [TW.Step]: (input: L) => M },
    step14: { [TW.Step]: (input: M) => N },
    step15: { [TW.Step]: (input: N) => O },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, O>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : {
          [TW.Type]: OptionsType;
          [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
        },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
    step5: { [TW.Step]: (input: D) => E },
    step6: { [TW.Step]: (input: E) => F },
    step7: { [TW.Step]: (input: F) => G },
    step8: { [TW.Step]: (input: G) => H },
    step9: { [TW.Step]: (input: H) => I },
    step10: { [TW.Step]: (input: I) => J },
    step11: { [TW.Step]: (input: J) => K },
    step12: { [TW.Step]: (input: K) => L },
    step13: { [TW.Step]: (input: L) => M },
    step14: { [TW.Step]: (input: M) => N },
    step15: { [TW.Step]: (input: N) => O },
    step16: { [TW.Step]: (input: O) => P },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, P>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : {
          [TW.Type]: OptionsType;
          [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
        },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
    step5: { [TW.Step]: (input: D) => E },
    step6: { [TW.Step]: (input: E) => F },
    step7: { [TW.Step]: (input: F) => G },
    step8: { [TW.Step]: (input: G) => H },
    step9: { [TW.Step]: (input: H) => I },
    step10: { [TW.Step]: (input: I) => J },
    step11: { [TW.Step]: (input: J) => K },
    step12: { [TW.Step]: (input: K) => L },
    step13: { [TW.Step]: (input: L) => M },
    step14: { [TW.Step]: (input: M) => N },
    step15: { [TW.Step]: (input: N) => O },
    step16: { [TW.Step]: (input: O) => P },
    step17: { [TW.Step]: (input: P) => Q },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, Q>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : {
          [TW.Type]: OptionsType;
          [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
        },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
    step5: { [TW.Step]: (input: D) => E },
    step6: { [TW.Step]: (input: E) => F },
    step7: { [TW.Step]: (input: F) => G },
    step8: { [TW.Step]: (input: G) => H },
    step9: { [TW.Step]: (input: H) => I },
    step10: { [TW.Step]: (input: I) => J },
    step11: { [TW.Step]: (input: J) => K },
    step12: { [TW.Step]: (input: K) => L },
    step13: { [TW.Step]: (input: L) => M },
    step14: { [TW.Step]: (input: M) => N },
    step15: { [TW.Step]: (input: N) => O },
    step16: { [TW.Step]: (input: O) => P },
    step17: { [TW.Step]: (input: P) => Q },
    step18: { [TW.Step]: (input: Q) => R },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, R>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : {
          [TW.Type]: OptionsType;
          [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
        },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
    step5: { [TW.Step]: (input: D) => E },
    step6: { [TW.Step]: (input: E) => F },
    step7: { [TW.Step]: (input: F) => G },
    step8: { [TW.Step]: (input: G) => H },
    step9: { [TW.Step]: (input: H) => I },
    step10: { [TW.Step]: (input: I) => J },
    step11: { [TW.Step]: (input: J) => K },
    step12: { [TW.Step]: (input: K) => L },
    step13: { [TW.Step]: (input: L) => M },
    step14: { [TW.Step]: (input: M) => N },
    step15: { [TW.Step]: (input: N) => O },
    step16: { [TW.Step]: (input: O) => P },
    step17: { [TW.Step]: (input: P) => Q },
    step18: { [TW.Step]: (input: Q) => R },
    step19: { [TW.Step]: (input: R) => S },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, S>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : {
          [TW.Type]: OptionsType;
          [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
        },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
    step5: { [TW.Step]: (input: D) => E },
    step6: { [TW.Step]: (input: E) => F },
    step7: { [TW.Step]: (input: F) => G },
    step8: { [TW.Step]: (input: G) => H },
    step9: { [TW.Step]: (input: H) => I },
    step10: { [TW.Step]: (input: I) => J },
    step11: { [TW.Step]: (input: J) => K },
    step12: { [TW.Step]: (input: K) => L },
    step13: { [TW.Step]: (input: L) => M },
    step14: { [TW.Step]: (input: M) => N },
    step15: { [TW.Step]: (input: N) => O },
    step16: { [TW.Step]: (input: O) => P },
    step17: { [TW.Step]: (input: P) => Q },
    step18: { [TW.Step]: (input: Q) => R },
    step19: { [TW.Step]: (input: R) => S },
    step20: { [TW.Step]: (input: S) => T },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, T>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : {
          [TW.Type]: OptionsType;
          [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
        },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
    step5: { [TW.Step]: (input: D) => E },
    step6: { [TW.Step]: (input: E) => F },
    step7: { [TW.Step]: (input: F) => G },
    step8: { [TW.Step]: (input: G) => H },
    step9: { [TW.Step]: (input: H) => I },
    step10: { [TW.Step]: (input: I) => J },
    step11: { [TW.Step]: (input: J) => K },
    step12: { [TW.Step]: (input: K) => L },
    step13: { [TW.Step]: (input: L) => M },
    step14: { [TW.Step]: (input: M) => N },
    step15: { [TW.Step]: (input: N) => O },
    step16: { [TW.Step]: (input: O) => P },
    step17: { [TW.Step]: (input: P) => Q },
    step18: { [TW.Step]: (input: Q) => R },
    step19: { [TW.Step]: (input: R) => S },
    step20: { [TW.Step]: (input: S) => T },
    step21: { [TW.Step]: (input: T) => U },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, U>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : {
          [TW.Type]: OptionsType;
          [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
        },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
    step5: { [TW.Step]: (input: D) => E },
    step6: { [TW.Step]: (input: E) => F },
    step7: { [TW.Step]: (input: F) => G },
    step8: { [TW.Step]: (input: G) => H },
    step9: { [TW.Step]: (input: H) => I },
    step10: { [TW.Step]: (input: I) => J },
    step11: { [TW.Step]: (input: J) => K },
    step12: { [TW.Step]: (input: K) => L },
    step13: { [TW.Step]: (input: L) => M },
    step14: { [TW.Step]: (input: M) => N },
    step15: { [TW.Step]: (input: N) => O },
    step16: { [TW.Step]: (input: O) => P },
    step17: { [TW.Step]: (input: P) => Q },
    step18: { [TW.Step]: (input: Q) => R },
    step19: { [TW.Step]: (input: R) => S },
    step20: { [TW.Step]: (input: S) => T },
    step21: { [TW.Step]: (input: T) => U },
    step22: { [TW.Step]: (input: U) => V },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, V>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : {
          [TW.Type]: OptionsType;
          [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
        },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
    step5: { [TW.Step]: (input: D) => E },
    step6: { [TW.Step]: (input: E) => F },
    step7: { [TW.Step]: (input: F) => G },
    step8: { [TW.Step]: (input: G) => H },
    step9: { [TW.Step]: (input: H) => I },
    step10: { [TW.Step]: (input: I) => J },
    step11: { [TW.Step]: (input: J) => K },
    step12: { [TW.Step]: (input: K) => L },
    step13: { [TW.Step]: (input: L) => M },
    step14: { [TW.Step]: (input: M) => N },
    step15: { [TW.Step]: (input: N) => O },
    step16: { [TW.Step]: (input: O) => P },
    step17: { [TW.Step]: (input: P) => Q },
    step18: { [TW.Step]: (input: Q) => R },
    step19: { [TW.Step]: (input: R) => S },
    step20: { [TW.Step]: (input: S) => T },
    step21: { [TW.Step]: (input: T) => U },
    step22: { [TW.Step]: (input: U) => V },
    step23: { [TW.Step]: (input: V) => W },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, W>;
  <
    SubCtx,
    A,
    B,
    C,
    D,
    E,
    F,
    G,
    H,
    I,
    J,
    K,
    L,
    M,
    N,
    O,
    P,
    Q,
    R,
    S,
    T,
    U,
    V,
    W,
    X,
  >(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : {
          [TW.Type]: OptionsType;
          [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
        },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
    step5: { [TW.Step]: (input: D) => E },
    step6: { [TW.Step]: (input: E) => F },
    step7: { [TW.Step]: (input: F) => G },
    step8: { [TW.Step]: (input: G) => H },
    step9: { [TW.Step]: (input: H) => I },
    step10: { [TW.Step]: (input: I) => J },
    step11: { [TW.Step]: (input: J) => K },
    step12: { [TW.Step]: (input: K) => L },
    step13: { [TW.Step]: (input: L) => M },
    step14: { [TW.Step]: (input: M) => N },
    step15: { [TW.Step]: (input: N) => O },
    step16: { [TW.Step]: (input: O) => P },
    step17: { [TW.Step]: (input: P) => Q },
    step18: { [TW.Step]: (input: Q) => R },
    step19: { [TW.Step]: (input: R) => S },
    step20: { [TW.Step]: (input: S) => T },
    step21: { [TW.Step]: (input: T) => U },
    step22: { [TW.Step]: (input: U) => V },
    step23: { [TW.Step]: (input: V) => W },
    step24: { [TW.Step]: (input: W) => X },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, X>;
  <
    SubCtx,
    A,
    B,
    C,
    D,
    E,
    F,
    G,
    H,
    I,
    J,
    K,
    L,
    M,
    N,
    O,
    P,
    Q,
    R,
    S,
    T,
    U,
    V,
    W,
    X,
    Y,
  >(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : {
          [TW.Type]: OptionsType;
          [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
        },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
    step5: { [TW.Step]: (input: D) => E },
    step6: { [TW.Step]: (input: E) => F },
    step7: { [TW.Step]: (input: F) => G },
    step8: { [TW.Step]: (input: G) => H },
    step9: { [TW.Step]: (input: H) => I },
    step10: { [TW.Step]: (input: I) => J },
    step11: { [TW.Step]: (input: J) => K },
    step12: { [TW.Step]: (input: K) => L },
    step13: { [TW.Step]: (input: L) => M },
    step14: { [TW.Step]: (input: M) => N },
    step15: { [TW.Step]: (input: N) => O },
    step16: { [TW.Step]: (input: O) => P },
    step17: { [TW.Step]: (input: P) => Q },
    step18: { [TW.Step]: (input: Q) => R },
    step19: { [TW.Step]: (input: R) => S },
    step20: { [TW.Step]: (input: S) => T },
    step21: { [TW.Step]: (input: T) => U },
    step22: { [TW.Step]: (input: U) => V },
    step23: { [TW.Step]: (input: V) => W },
    step24: { [TW.Step]: (input: W) => X },
    step25: { [TW.Step]: (input: X) => Y },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, Y>;
  <
    SubCtx,
    A,
    B,
    C,
    D,
    E,
    F,
    G,
    H,
    I,
    J,
    K,
    L,
    M,
    N,
    O,
    P,
    Q,
    R,
    S,
    T,
    U,
    V,
    W,
    X,
    Y,
    Z,
  >(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : {
          [TW.Type]: OptionsType;
          [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
        },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
    step5: { [TW.Step]: (input: D) => E },
    step6: { [TW.Step]: (input: E) => F },
    step7: { [TW.Step]: (input: F) => G },
    step8: { [TW.Step]: (input: G) => H },
    step9: { [TW.Step]: (input: H) => I },
    step10: { [TW.Step]: (input: I) => J },
    step11: { [TW.Step]: (input: J) => K },
    step12: { [TW.Step]: (input: K) => L },
    step13: { [TW.Step]: (input: L) => M },
    step14: { [TW.Step]: (input: M) => N },
    step15: { [TW.Step]: (input: N) => O },
    step16: { [TW.Step]: (input: O) => P },
    step17: { [TW.Step]: (input: P) => Q },
    step18: { [TW.Step]: (input: Q) => R },
    step19: { [TW.Step]: (input: R) => S },
    step20: { [TW.Step]: (input: S) => T },
    step21: { [TW.Step]: (input: T) => U },
    step22: { [TW.Step]: (input: U) => V },
    step23: { [TW.Step]: (input: V) => W },
    step24: { [TW.Step]: (input: W) => X },
    step25: { [TW.Step]: (input: X) => Y },
    step26: { [TW.Step]: (input: Y) => Z },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, Z>;
}

// ── Steps implementation ──────────────────────────────────────────────────────

export const Steps: Steps<typeof SubSteps, SubStepsResultKind> = (
  ...steps: any[]
) => {
  return { [SubSteps]: steps } as never;
};
