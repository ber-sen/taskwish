import { ToCamelCase } from "../helpers";
import { TW } from "../core";
import type { Behavior } from "../actor";

export const SubSteps = Symbol.for("SubSteps");

export type StepsReturn<Ctx, SubCtx, Last, Result = void> = [Result] extends [
  "def",
]
  ? "name" extends keyof Ctx
    ? Ctx["name"] extends string
      ? { [name in Ctx["name"]]: () => Behavior<Last> }
      : never
    : never
  : Ctx extends typeof SubSteps
    ? {
        [TW.Step]: (input: SubCtx) => Last;
      }
    : "name" extends keyof Ctx
      ? Ctx["name"] extends string
        ? {
            [name in Ctx["name"]]: TW.Action<
              Ctx["name"],
              "scope" extends keyof Ctx
                ? "input" extends keyof Ctx["scope"]
                  ? (
                      input: "scope" extends keyof Ctx
                        ? "$call" extends keyof Ctx["scope"]
                          ? Ctx["scope"]["$call"]
                          : "input" extends keyof Ctx["scope"]
                            ? Ctx["scope"]["input"]
                            : never
                        : never,
                    ) => Promise<
                      "last" extends keyof Last
                        ? Last["last"]
                        : "steps" extends keyof Last
                          ? Last["steps"]
                          : Last
                    >
                  : () => Promise<
                      "last" extends keyof Last
                        ? Last["last"]
                        : "steps" extends keyof Last
                          ? Last["steps"]
                          : Last
                    >
                : () => Promise<
                    "last" extends keyof Last
                      ? Last["last"]
                      : "steps" extends keyof Last
                        ? Last["steps"]
                        : Last
                  >
            >;
          }
        : never
      : never;

export interface Steps<
  Ctx extends Record<any, any> | typeof SubSteps,
  Result = void,
> {
  <SubCtx extends Record<any, any>, A>(
    step:
      | { [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      | ((
          this: Ctx extends typeof SubSteps ? SubCtx["scope"] : Ctx["scope"],
        ) => A),
  ): StepsReturn<Ctx, SubCtx, A, Result>;
  <SubCtx, A, B>(
    step1: {
      [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
    },
    step2: { [TW.Step]: (input: A) => B },
  ): StepsReturn<Ctx, SubCtx, B, Result>;
  <SubCtx, A, B, C>(
    step1: {
      [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
    },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
  ): StepsReturn<Ctx, SubCtx, C, Result>;
  <SubCtx, A, B, C, D>(
    step1: {
      [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
    },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
  ): StepsReturn<Ctx, SubCtx, D, Result>;
  <SubCtx, A, B, C, D, E>(
    step1: {
      [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
    },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
    step5: { [TW.Step]: (input: D) => E },
  ): StepsReturn<Ctx, SubCtx, E, Result>;
  <SubCtx, A, B, C, D, E, F>(
    step1: {
      [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
    },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
    step5: { [TW.Step]: (input: D) => E },
    step6: { [TW.Step]: (input: E) => F },
  ): StepsReturn<Ctx, SubCtx, F, Result>;
  <SubCtx, A, B, C, D, E, F, G>(
    step1: {
      [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
    },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
    step5: { [TW.Step]: (input: D) => E },
    step6: { [TW.Step]: (input: E) => F },
    step7: { [TW.Step]: (input: F) => G },
  ): StepsReturn<Ctx, SubCtx, G, Result>;
  <SubCtx, A, B, C, D, E, F, G, H>(
    step1: {
      [TW.Step]: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A;
    },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
    step4: { [TW.Step]: (input: C) => D },
    step5: { [TW.Step]: (input: D) => E },
    step6: { [TW.Step]: (input: E) => F },
    step7: { [TW.Step]: (input: F) => G },
    step8: { [TW.Step]: (input: G) => H },
  ): StepsReturn<Ctx, SubCtx, H, Result>;
  <SubCtx, A, B, C, D, E, F, G, H, I>(
    step1: {
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
  ): StepsReturn<Ctx, SubCtx, I, Result>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J>(
    step1: {
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
  ): StepsReturn<Ctx, SubCtx, J, Result>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K>(
    step1: {
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
  ): StepsReturn<Ctx, SubCtx, K, Result>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L>(
    step1: {
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
  ): StepsReturn<Ctx, SubCtx, L, Result>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M>(
    step1: {
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
  ): StepsReturn<Ctx, SubCtx, M, Result>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N>(
    step1: {
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
  ): StepsReturn<Ctx, SubCtx, N, Result>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O>(
    step1: {
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
  ): StepsReturn<Ctx, SubCtx, O, Result>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P>(
    step1: {
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
  ): StepsReturn<Ctx, SubCtx, P, Result>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q>(
    step1: {
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
  ): StepsReturn<Ctx, SubCtx, Q, Result>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R>(
    step1: {
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
  ): StepsReturn<Ctx, SubCtx, R, Result>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S>(
    step1: {
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
  ): StepsReturn<Ctx, SubCtx, S, Result>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T>(
    step1: {
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
  ): StepsReturn<Ctx, SubCtx, T, Result>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U>(
    step1: {
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
  ): StepsReturn<Ctx, SubCtx, U, Result>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V>(
    step1: {
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
  ): StepsReturn<Ctx, SubCtx, V, Result>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W>(
    step1: {
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
  ): StepsReturn<Ctx, SubCtx, W, Result>;
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
    step1: {
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
  ): StepsReturn<Ctx, SubCtx, X, Result>;
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
    step1: {
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
  ): StepsReturn<Ctx, SubCtx, Y, Result>;
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
    step1: {
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
  ): StepsReturn<Ctx, SubCtx, Z, Result>;
}

export const Steps: Steps<typeof SubSteps> = (...steps: any[]) => {
  const merged: Record<string, unknown> = {};
  for (const step of steps) {
    if (step !== null && typeof step === "object") {
      Object.assign(merged, step);
    }
  }
  return merged as never;
};
