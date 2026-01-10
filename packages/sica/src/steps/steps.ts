export const Last = Symbol.for("Last");

interface Scope {
  ai: {
    generateText: (params: { model: "gpt5"; prompt: string }) => string;
  };
  action: {
    slack: {
      sendMessage: (params: { channel: "#general"; message: string }) => string;
    };
  };
}

export type StepsReturn<Scope> = typeof Last extends keyof Scope
  ? Scope[typeof Last]
  : Scope;

export interface Steps<Scope extends Record<any, any>> {
  <A>(
    step: { step: (input: Scope) => A } | ((this: Scope) => A)
  ): StepsReturn<A>;
  <A, B>(
    step1: { step: (input: Scope) => A },
    step2: { step: (input: A) => B }
  ): StepsReturn<B>;
  <A, B, C>(
    step1: { step: (input: Scope) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C }
  ): StepsReturn<C>;
  <A, B, C, D>(
    step1: { step: (input: Scope) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D }
  ): StepsReturn<D>;
  <A, B, C, D, E>(
    step1: { step: (input: Scope) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
    step5: { step: (input: D) => E }
  ): StepsReturn<E>;
  <A, B, C, D, E, F>(
    step1: { step: (input: Scope) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
    step5: { step: (input: D) => E },
    step6: { step: (input: E) => F }
  ): StepsReturn<F>;
  <A, B, C, D, E, F, G>(
    step1: { step: (input: Scope) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
    step5: { step: (input: D) => E },
    step6: { step: (input: E) => F },
    step7: { step: (input: F) => G }
  ): StepsReturn<G>;
  <A, B, C, D, E, F, G, H>(
    step1: { step: (input: Scope) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
    step5: { step: (input: D) => E },
    step6: { step: (input: E) => F },
    step7: { step: (input: F) => G },
    step8: { step: (input: G) => H }
  ): StepsReturn<H>;
  <A, B, C, D, E, F, G, H, I>(
    step1: { step: (input: Scope) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
    step5: { step: (input: D) => E },
    step6: { step: (input: E) => F },
    step7: { step: (input: F) => G },
    step8: { step: (input: G) => H },
    step9: { step: (input: H) => I }
  ): StepsReturn<I>;
  <A, B, C, D, E, F, G, H, I, J>(
    step1: { step: (input: Scope) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
    step5: { step: (input: D) => E },
    step6: { step: (input: E) => F },
    step7: { step: (input: F) => G },
    step8: { step: (input: G) => H },
    step9: { step: (input: H) => I },
    step10: { step: (input: I) => J }
  ): StepsReturn<J>;
  <A, B, C, D, E, F, G, H, I, J, K>(
    step1: { step: (input: Scope) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D },
    step5: { step: (input: D) => E },
    step6: { step: (input: E) => F },
    step7: { step: (input: F) => G },
    step8: { step: (input: G) => H },
    step9: { step: (input: H) => I },
    step10: { step: (input: I) => J },
    step11: { step: (input: J) => K }
  ): StepsReturn<K>;
  <A, B, C, D, E, F, G, H, I, J, K, L>(
    step1: { step: (input: Scope) => A },
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
    step12: { step: (input: K) => L }
  ): StepsReturn<L>;
  <A, B, C, D, E, F, G, H, I, J, K, L, M>(
    step1: { step: (input: Scope) => A },
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
    step13: { step: (input: L) => M }
  ): StepsReturn<M>;
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N>(
    step1: { step: (input: Scope) => A },
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
    step14: { step: (input: M) => N }
  ): StepsReturn<N>;
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O>(
    step1: { step: (input: Scope) => A },
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
    step15: { step: (input: N) => O }
  ): StepsReturn<O>;
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P>(
    step1: { step: (input: Scope) => A },
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
    step16: { step: (input: O) => P }
  ): StepsReturn<O>;
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P>(
    step1: { step: (input: Scope) => A },
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
    step16: { step: (input: O) => P }
  ): StepsReturn<P>;
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q>(
    step1: { step: (input: Scope) => A },
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
    step17: { step: (input: P) => Q }
  ): StepsReturn<Q>;
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R>(
    step1: { step: (input: Scope) => A },
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
    step18: { step: (input: Q) => R }
  ): StepsReturn<R>;
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S>(
    step1: { step: (input: Scope) => A },
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
    step19: { step: (input: R) => S }
  ): StepsReturn<S>;
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T>(
    step1: { step: (input: Scope) => A },
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
    step20: { step: (input: S) => T }
  ): StepsReturn<T>;
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U>(
    step1: { step: (input: Scope) => A },
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
    step21: { step: (input: T) => U }
  ): StepsReturn<U>;
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V>(
    step1: { step: (input: Scope) => A },
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
    step22: { step: (input: U) => V }
  ): StepsReturn<V>;
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W>(
    step1: { step: (input: Scope) => A },
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
    step23: { step: (input: V) => W }
  ): StepsReturn<W>;
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X>(
    step1: { step: (input: Scope) => A },
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
    step24: { step: (input: W) => X }
  ): StepsReturn<X>;
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y>(
    step1: { step: (input: Scope) => A },
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
    step25: { step: (input: X) => Y }
  ): StepsReturn<Y>;
  <
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
    step1: { step: (input: Scope) => A },
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
    step26: { step: (input: Y) => Z }
  ): StepsReturn<Y>;
}

export const Steps: Steps<Scope> = () => {
  return {} as never;
};
