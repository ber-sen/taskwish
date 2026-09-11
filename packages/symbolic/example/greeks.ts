import { Actor, Step } from "@taskwish/core";

import { Function, Model, Real, RealSort } from "../src";

const { actor } = Actor("Options");

export const { checkGreeksFormula } = actor()
  .on("Command", "checkGreeksFormula")

  .run(
    Real(
      "S",
      "K",
      "r",
      "sigma",
      "tau",
      "d1",
      "d2",
      "delta",
      "gamma",
      "vega",
      "theta",
      "rho",
    ),

    // These match the Z3 example's uninterpreted functions. The model captures
    // the formula's structure; add axioms/approximations for numerical pricing.
    Function("log", RealSort(), RealSort()),
    Function("exp", RealSort(), RealSort()),
    Function("sqrt", RealSort(), RealSort()),
    Function("N", RealSort(), RealSort()),
    Function("n", RealSort(), RealSort()),

    Model(
      "blackScholesGreeks",

      ({ S, K, r, sigma, tau, d1, log, sqrt }) =>
        d1 ==
        (log(S / K) + (r + (sigma * sigma) / 2) * tau) /
          (sigma * sqrt(tau)),

      ({ d1, d2, sigma, tau, sqrt }) =>
        d2 == d1 - sigma * sqrt(tau),

      ({ delta, d1, N }) => delta == N(d1),

      ({ gamma, d1, S, sigma, tau, n, sqrt }) =>
        gamma == n(d1) / (S * sigma * sqrt(tau)),

      ({ vega, S, d1, tau, n, sqrt }) =>
        vega == S * n(d1) * sqrt(tau),

      ({ theta, S, d1, sigma, tau, r, K, d2, n, sqrt, exp, N }) =>
        theta ==
        -(S * n(d1) * sigma) / (2 * sqrt(tau)) -
          r * K * exp(-r * tau) * N(d2),

      ({ rho, K, tau, r, d2, exp, N }) =>
        rho == K * tau * exp(-r * tau) * N(d2),
    ),

    Step("result", function () {
      return this.blackScholesGreeks.solve({
        S: 100,
        K: 100,
        r: 0.05,
        sigma: 0.2,
        tau: 1,
      });
    }),
  );
