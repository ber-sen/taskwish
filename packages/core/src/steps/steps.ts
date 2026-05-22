import { TW } from "../core";
import { ResolveLast } from "../helpers";
import { ResultKind, ApplyResult } from "./hkt";

export const SubSteps = Symbol.for("SubSteps");

// ── Built-in result kinds ─────────────────────────────────────────────────────

/**
 * Used by `Steps<Ctx, ActionResultKind>` — the normal action mode that
 * produces a `TW.Action` callable.
 */
export interface ActionResultKind extends ResultKind {
  type: this["ctx"] extends Record<any, any>
    ? "name" extends keyof this["ctx"]
      ? this["ctx"]["name"] extends string
        ? "typeLogger" extends keyof this["ctx"]["scope"]
          ? this["ctx"]["scope"]["typeLogger"] extends true
            ? this["last"] extends { steps: infer S extends any[] } ? S : never
            : {
                [name in this["ctx"]["name"]]: TW.Action<
                  this["ctx"]["name"],
                  "scope" extends keyof this["ctx"]
                    ? "input" extends keyof this["ctx"]["scope"]
                      ? (
                          input: "scope" extends keyof this["ctx"]
                            ? "$call" extends keyof this["ctx"]["scope"]
                              ? this["ctx"]["scope"]["$call"]
                              : "input" extends keyof this["ctx"]["scope"]
                                ? this["ctx"]["scope"]["input"]
                                : never
                            : never,
                        ) => Promise<
                          "last" extends keyof this["last"]
                            ? ResolveLast<this["last"]["last"]>
                            : "steps" extends keyof this["last"]
                              ? this["last"]["steps"]
                              : this["last"]
                        >
                      : () => Promise<
                          "last" extends keyof this["last"]
                            ? ResolveLast<this["last"]["last"]>
                            : "steps" extends keyof this["last"]
                              ? this["last"]["steps"]
                              : this["last"]
                        >
                    : () => Promise<
                        "last" extends keyof this["last"]
                          ? ResolveLast<this["last"]["last"]>
                          : "steps" extends keyof this["last"]
                            ? this["last"]["steps"]
                            : this["last"]
                      >
                >;
              }
          : {
              [name in this["ctx"]["name"]]: TW.Action<
                this["ctx"]["name"],
                "scope" extends keyof this["ctx"]
                  ? "input" extends keyof this["ctx"]["scope"]
                    ? (
                        input: "scope" extends keyof this["ctx"]
                          ? "$call" extends keyof this["ctx"]["scope"]
                            ? this["ctx"]["scope"]["$call"]
                            : "input" extends keyof this["ctx"]["scope"]
                              ? this["ctx"]["scope"]["input"]
                              : never
                          : never,
                      ) => Promise<
                        "last" extends keyof this["last"]
                          ? ResolveLast<this["last"]["last"]>
                          : "steps" extends keyof this["last"]
                            ? this["last"]["steps"]
                            : this["last"]
                      >
                    : () => Promise<
                        "last" extends keyof this["last"]
                          ? ResolveLast<this["last"]["last"]>
                          : "steps" extends keyof this["last"]
                            ? this["last"]["steps"]
                            : this["last"]
                      >
                  : () => Promise<
                      "last" extends keyof this["last"]
                        ? ResolveLast<this["last"]["last"]>
                        : "steps" extends keyof this["last"]
                          ? this["last"]["steps"]
                          : this["last"]
                    >
              >;
            }
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
          | { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
          | ((
              this: Ctx extends typeof SubSteps ? SubCtx["scope"] : Ctx["scope"],
            ) => A)
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, A>;
  <SubCtx, A, B>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { [TW.Step]: (input: A) => B },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, B>;
  <SubCtx, A, B, C>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, C>;
  <SubCtx, A, B, C, D>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, D>;
  <SubCtx, A, B, C, D, E>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
    step5: { [TW.Step]: (input: D) => E },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, E>;
  <SubCtx, A, B, C, D, E, F>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
    step5: { [TW.Step]: (input: D) => E },
    step6: { [TW.Step]: (input: E) => F },
  ): ApplyResult<RK, Ctx extends typeof SubSteps ? SubCtx : Ctx, F>;
  <SubCtx, A, B, C, D, E, F, G>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
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
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
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
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
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
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
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
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
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
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
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
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
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
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
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
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
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
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
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
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
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
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
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
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
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
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
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
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
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
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
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
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
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
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
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
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
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
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z>(
    step1: [OptionsType] extends [never]
      ? { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      : { [TW.Type]: OptionsType; [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
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
