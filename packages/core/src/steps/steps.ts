import { ToCamelCase } from "../helpers";
import { Taskwish } from "../types";

export const SubSteps = Symbol.for("SubSteps");

export type StepsReturn<Ctx, SubCtx, Last> = Ctx extends typeof SubSteps
  ? {
      step: (input: SubCtx) => Last;
    }
  : "name" extends keyof Ctx
    ? Ctx["name"] extends string
      ? {
          [name in ToCamelCase<Ctx["name"]>]: Taskwish.Action<
            Ctx["name"],
            "scope" extends keyof Ctx
              ? "input" extends keyof Ctx["scope"]
                ? (
                    input: "scope" extends keyof Ctx
                      ? "input" extends keyof Ctx["scope"]
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

export interface Steps<Ctx extends Record<any, any> | typeof SubSteps> {
  <SubCtx extends Record<any, any>, A>(
    step:
      | { step: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A }
      | ((
          this: Ctx extends typeof SubSteps ? SubCtx["scope"] : Ctx["scope"],
        ) => A),
  ): StepsReturn<Ctx, SubCtx, A>;
  <SubCtx, A, B>(
    step1: { step: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { step: (input: A) => B },
  ): StepsReturn<Ctx, SubCtx, B>;
  <SubCtx, A, B, C>(
    step1: { step: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
  ): StepsReturn<Ctx, SubCtx, C>;
  <SubCtx, A, B, C, D>(
    step1: { step: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
  ): StepsReturn<Ctx, SubCtx, D>;
  <SubCtx, A, B, C, D, E>(
    step1: { step: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
    step5: { step: (input: D) => E },
  ): StepsReturn<Ctx, SubCtx, E>;
  <SubCtx, A, B, C, D, E, F>(
    step1: { step: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
    step5: { step: (input: D) => E },
    step6: { step: (input: E) => F },
  ): StepsReturn<Ctx, SubCtx, F>;
  <SubCtx, A, B, C, D, E, F, G>(
    step1: { step: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
    step5: { step: (input: D) => E },
    step6: { step: (input: E) => F },
    step7: { step: (input: F) => G },
  ): StepsReturn<Ctx, SubCtx, G>;
  <SubCtx, A, B, C, D, E, F, G, H>(
    step1: { step: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
    step5: { step: (input: D) => E },
    step6: { step: (input: E) => F },
    step7: { step: (input: F) => G },
    step8: { step: (input: G) => H },
  ): StepsReturn<Ctx, SubCtx, H>;
  <SubCtx, A, B, C, D, E, F, G, H, I>(
    step1: { step: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
    step5: { step: (input: D) => E },
    step6: { step: (input: E) => F },
    step7: { step: (input: F) => G },
    step8: { step: (input: G) => H },
    step9: { step: (input: H) => I },
  ): StepsReturn<Ctx, SubCtx, I>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J>(
    step1: { step: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
    step5: { step: (input: D) => E },
    step6: { step: (input: E) => F },
    step7: { step: (input: F) => G },
    step8: { step: (input: G) => H },
    step9: { step: (input: H) => I },
    step10: { step: (input: I) => J },
  ): StepsReturn<Ctx, SubCtx, J>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K>(
    step1: { step: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
    step5: { step: (input: D) => E },
    step6: { step: (input: E) => F },
    step7: { step: (input: F) => G },
    step8: { step: (input: G) => H },
    step9: { step: (input: H) => I },
    step10: { step: (input: I) => J },
    step11: { step: (input: J) => K },
  ): StepsReturn<Ctx, SubCtx, K>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L>(
    step1: { step: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
    step5: { step: (input: D) => E },
    step6: { step: (input: E) => F },
    step7: { step: (input: F) => G },
    step8: { step: (input: G) => H },
    step9: { step: (input: H) => I },
    step10: { step: (input: I) => J },
    step11: { step: (input: J) => K },
    step12: { step: (input: K) => L },
  ): StepsReturn<Ctx, SubCtx, L>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M>(
    step1: { step: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
    step5: { step: (input: D) => E },
    step6: { step: (input: E) => F },
    step7: { step: (input: F) => G },
    step8: { step: (input: G) => H },
    step9: { step: (input: H) => I },
    step10: { step: (input: I) => J },
    step11: { step: (input: J) => K },
    step12: { step: (input: K) => L },
    step13: { step: (input: L) => M },
  ): StepsReturn<Ctx, SubCtx, M>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N>(
    step1: { step: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
    step5: { step: (input: D) => E },
    step6: { step: (input: E) => F },
    step7: { step: (input: F) => G },
    step8: { step: (input: G) => H },
    step9: { step: (input: H) => I },
    step10: { step: (input: I) => J },
    step11: { step: (input: J) => K },
    step12: { step: (input: K) => L },
    step13: { step: (input: L) => M },
    step14: { step: (input: M) => N },
  ): StepsReturn<Ctx, SubCtx, N>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O>(
    step1: { step: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
    step5: { step: (input: D) => E },
    step6: { step: (input: E) => F },
    step7: { step: (input: F) => G },
    step8: { step: (input: G) => H },
    step9: { step: (input: H) => I },
    step10: { step: (input: I) => J },
    step11: { step: (input: J) => K },
    step12: { step: (input: K) => L },
    step13: { step: (input: L) => M },
    step14: { step: (input: M) => N },
    step15: { step: (input: N) => O },
  ): StepsReturn<Ctx, SubCtx, O>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P>(
    step1: { step: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
    step5: { step: (input: D) => E },
    step6: { step: (input: E) => F },
    step7: { step: (input: F) => G },
    step8: { step: (input: G) => H },
    step9: { step: (input: H) => I },
    step10: { step: (input: I) => J },
    step11: { step: (input: J) => K },
    step12: { step: (input: K) => L },
    step13: { step: (input: L) => M },
    step14: { step: (input: M) => N },
    step15: { step: (input: N) => O },
    step16: { step: (input: O) => P },
  ): StepsReturn<Ctx, SubCtx, P>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q>(
    step1: { step: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
    step5: { step: (input: D) => E },
    step6: { step: (input: E) => F },
    step7: { step: (input: F) => G },
    step8: { step: (input: G) => H },
    step9: { step: (input: H) => I },
    step10: { step: (input: I) => J },
    step11: { step: (input: J) => K },
    step12: { step: (input: K) => L },
    step13: { step: (input: L) => M },
    step14: { step: (input: M) => N },
    step15: { step: (input: N) => O },
    step16: { step: (input: O) => P },
    step17: { step: (input: P) => Q },
  ): StepsReturn<Ctx, SubCtx, Q>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R>(
    step1: { step: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
    step5: { step: (input: D) => E },
    step6: { step: (input: E) => F },
    step7: { step: (input: F) => G },
    step8: { step: (input: G) => H },
    step9: { step: (input: H) => I },
    step10: { step: (input: I) => J },
    step11: { step: (input: J) => K },
    step12: { step: (input: K) => L },
    step13: { step: (input: L) => M },
    step14: { step: (input: M) => N },
    step15: { step: (input: N) => O },
    step16: { step: (input: O) => P },
    step17: { step: (input: P) => Q },
    step18: { step: (input: Q) => R },
  ): StepsReturn<Ctx, SubCtx, R>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S>(
    step1: { step: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
    step5: { step: (input: D) => E },
    step6: { step: (input: E) => F },
    step7: { step: (input: F) => G },
    step8: { step: (input: G) => H },
    step9: { step: (input: H) => I },
    step10: { step: (input: I) => J },
    step11: { step: (input: J) => K },
    step12: { step: (input: K) => L },
    step13: { step: (input: L) => M },
    step14: { step: (input: M) => N },
    step15: { step: (input: N) => O },
    step16: { step: (input: O) => P },
    step17: { step: (input: P) => Q },
    step18: { step: (input: Q) => R },
    step19: { step: (input: R) => S },
  ): StepsReturn<Ctx, SubCtx, S>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T>(
    step1: { step: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
    step5: { step: (input: D) => E },
    step6: { step: (input: E) => F },
    step7: { step: (input: F) => G },
    step8: { step: (input: G) => H },
    step9: { step: (input: H) => I },
    step10: { step: (input: I) => J },
    step11: { step: (input: J) => K },
    step12: { step: (input: K) => L },
    step13: { step: (input: L) => M },
    step14: { step: (input: M) => N },
    step15: { step: (input: N) => O },
    step16: { step: (input: O) => P },
    step17: { step: (input: P) => Q },
    step18: { step: (input: Q) => R },
    step19: { step: (input: R) => S },
    step20: { step: (input: S) => T },
  ): StepsReturn<Ctx, SubCtx, T>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U>(
    step1: { step: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
    step5: { step: (input: D) => E },
    step6: { step: (input: E) => F },
    step7: { step: (input: F) => G },
    step8: { step: (input: G) => H },
    step9: { step: (input: H) => I },
    step10: { step: (input: I) => J },
    step11: { step: (input: J) => K },
    step12: { step: (input: K) => L },
    step13: { step: (input: L) => M },
    step14: { step: (input: M) => N },
    step15: { step: (input: N) => O },
    step16: { step: (input: O) => P },
    step17: { step: (input: P) => Q },
    step18: { step: (input: Q) => R },
    step19: { step: (input: R) => S },
    step20: { step: (input: S) => T },
    step21: { step: (input: T) => U },
  ): StepsReturn<Ctx, SubCtx, U>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V>(
    step1: { step: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
    step5: { step: (input: D) => E },
    step6: { step: (input: E) => F },
    step7: { step: (input: F) => G },
    step8: { step: (input: G) => H },
    step9: { step: (input: H) => I },
    step10: { step: (input: I) => J },
    step11: { step: (input: J) => K },
    step12: { step: (input: K) => L },
    step13: { step: (input: L) => M },
    step14: { step: (input: M) => N },
    step15: { step: (input: N) => O },
    step16: { step: (input: O) => P },
    step17: { step: (input: P) => Q },
    step18: { step: (input: Q) => R },
    step19: { step: (input: R) => S },
    step20: { step: (input: S) => T },
    step21: { step: (input: T) => U },
    step22: { step: (input: U) => V },
  ): StepsReturn<Ctx, SubCtx, V>;
  <SubCtx, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W>(
    step1: { step: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
    step5: { step: (input: D) => E },
    step6: { step: (input: E) => F },
    step7: { step: (input: F) => G },
    step8: { step: (input: G) => H },
    step9: { step: (input: H) => I },
    step10: { step: (input: I) => J },
    step11: { step: (input: J) => K },
    step12: { step: (input: K) => L },
    step13: { step: (input: L) => M },
    step14: { step: (input: M) => N },
    step15: { step: (input: N) => O },
    step16: { step: (input: O) => P },
    step17: { step: (input: P) => Q },
    step18: { step: (input: Q) => R },
    step19: { step: (input: R) => S },
    step20: { step: (input: S) => T },
    step21: { step: (input: T) => U },
    step22: { step: (input: U) => V },
    step23: { step: (input: V) => W },
  ): StepsReturn<Ctx, SubCtx, W>;
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
    step1: { step: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
    step5: { step: (input: D) => E },
    step6: { step: (input: E) => F },
    step7: { step: (input: F) => G },
    step8: { step: (input: G) => H },
    step9: { step: (input: H) => I },
    step10: { step: (input: I) => J },
    step11: { step: (input: J) => K },
    step12: { step: (input: K) => L },
    step13: { step: (input: L) => M },
    step14: { step: (input: M) => N },
    step15: { step: (input: N) => O },
    step16: { step: (input: O) => P },
    step17: { step: (input: P) => Q },
    step18: { step: (input: Q) => R },
    step19: { step: (input: R) => S },
    step20: { step: (input: S) => T },
    step21: { step: (input: T) => U },
    step22: { step: (input: U) => V },
    step23: { step: (input: V) => W },
    step24: { step: (input: W) => X },
  ): StepsReturn<Ctx, SubCtx, X>;
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
    step1: { step: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
    step5: { step: (input: D) => E },
    step6: { step: (input: E) => F },
    step7: { step: (input: F) => G },
    step8: { step: (input: G) => H },
    step9: { step: (input: H) => I },
    step10: { step: (input: I) => J },
    step11: { step: (input: J) => K },
    step12: { step: (input: K) => L },
    step13: { step: (input: L) => M },
    step14: { step: (input: M) => N },
    step15: { step: (input: N) => O },
    step16: { step: (input: O) => P },
    step17: { step: (input: P) => Q },
    step18: { step: (input: Q) => R },
    step19: { step: (input: R) => S },
    step20: { step: (input: S) => T },
    step21: { step: (input: T) => U },
    step22: { step: (input: U) => V },
    step23: { step: (input: V) => W },
    step24: { step: (input: W) => X },
    step25: { step: (input: X) => Y },
  ): StepsReturn<Ctx, SubCtx, X>;
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
    step1: { step: (input: Ctx extends typeof SubSteps ? SubCtx : Ctx) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
    step5: { step: (input: D) => E },
    step6: { step: (input: E) => F },
    step7: { step: (input: F) => G },
    step8: { step: (input: G) => H },
    step9: { step: (input: H) => I },
    step10: { step: (input: I) => J },
    step11: { step: (input: J) => K },
    step12: { step: (input: K) => L },
    step13: { step: (input: L) => M },
    step14: { step: (input: M) => N },
    step15: { step: (input: N) => O },
    step16: { step: (input: O) => P },
    step17: { step: (input: P) => Q },
    step18: { step: (input: Q) => R },
    step19: { step: (input: R) => S },
    step20: { step: (input: S) => T },
    step21: { step: (input: T) => U },
    step22: { step: (input: U) => V },
    step23: { step: (input: V) => W },
    step24: { step: (input: W) => X },
    step25: { step: (input: X) => Y },
    step26: { step: (input: Y) => Z },
  ): StepsReturn<Ctx, SubCtx, Y>;
}

export const Steps: Steps<Ctx> = () => {
  return {} as never;
};
