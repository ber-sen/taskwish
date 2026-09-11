export type CallInputs = {
  spot: number;
  strike: number;
  rate: number;
  volatility: number;
  daysToExpiry: number;
};

export function evaluateInputFunctions(input: CallInputs) {
  const tau = input.daysToExpiry / 365;
  return {
    tau,
    sqrtTau: Math.sqrt(tau),
    logMoneyness: Math.log(input.spot / input.strike),
  };
}

export function evaluateDistributionFunctions(input: {
  rate: number;
  tau: number;
  d1: number;
  d2: number;
}) {
  return {
    discount: Math.exp(-input.rate * input.tau),
    densityD1: normalDensity(input.d1),
    cdfD1: normalCdf(input.d1),
    cdfD2: normalCdf(input.d2),
  };
}

function normalDensity(value: number): number {
  return Math.exp(-(value * value) / 2) / Math.sqrt(2 * Math.PI);
}

// Abramowitz-Stegun 7.1.26 approximation; maximum error is about 1.5e-7.
function normalCdf(value: number): number {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const erf =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t -
      0.284496736) *
      t +
      0.254829592) *
      t) *
      Math.exp(-(x * x));
  return 0.5 * (1 + sign * erf);
}
