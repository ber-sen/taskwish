import { type } from "arktype";

export const stopDefinition = {
  stopType: "'Pickup' | 'Delivery'",
  locationId: "string | null",
  locationName: "string | null",
  address: "string | null",
  city: "string | null",
  state: "string | null",
  postalCode: "string | null",
  arrivalEarly: "string | null",
  arrivalLate: "string | null",
} as const;

export const loadDefinition = {
  reference: "string | null",
  commodity: "string | null",
  trailerType: "string | null",
  hazmat: "boolean | null",
  hazmatId: "string | null",
  temperatureLowF: "number | null",
  temperatureHighF: "number | null",
  weightLb: "number | null",
  pieces: "number | null",
  linehaul: "number | null",
  currency: "string | null",
  collectionMethod:
    "'PrePaid' | 'Collect' | 'ThirdParty' | 'CollectOnDelivery' | null",
  stops: type(stopDefinition).array(),
  instructions: "string | null",
  concerns: "string[]",
} as const;

export const Load = type(loadDefinition);
export type Load = typeof Load.infer;

const nullableString = { type: ["string", "null"] };
const nullableNumber = { type: ["number", "null"] };
const stopProperties = Object.fromEntries(
  Object.keys(stopDefinition).map((key) => [
    key,
    key === "stopType"
      ? { type: "string", enum: ["Pickup", "Delivery"] }
      : nullableString,
  ])
);
const properties = {
  reference: nullableString,
  commodity: nullableString,
  trailerType: nullableString,
  hazmat: { type: ["boolean", "null"] },
  hazmatId: nullableString,
  temperatureLowF: nullableNumber,
  temperatureHighF: nullableNumber,
  weightLb: nullableNumber,
  pieces: nullableNumber,
  linehaul: nullableNumber,
  currency: nullableString,
  collectionMethod: {
    type: ["string", "null"],
    enum: ["PrePaid", "Collect", "ThirdParty", "CollectOnDelivery", null],
  },
  stops: {
    type: "array",
    items: {
      type: "object",
      properties: stopProperties,
      required: Object.keys(stopProperties),
      additionalProperties: false,
    },
  },
  instructions: nullableString,
  concerns: { type: "array", items: { type: "string" } },
};

export const loadJsonSchema = {
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
};

export function parseLoad(value: unknown): Load {
  const result = Load(value);
  if (result instanceof type.errors)
    throw new Error(`Invalid load structure: ${result.summary}`);
  return result;
}

function hasText(value: string | null): boolean {
  return Boolean(value?.trim());
}

function validTime(value: string | null): boolean {
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.test(
      value
    )
  )
    return false;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  return (
    Number.isFinite(Date.parse(value)) &&
    date.toISOString().slice(0, 10) === value.slice(0, 10)
  );
}

export function validateLoad(load: Load): string[] {
  const issues = load.concerns.map((concern) => `Source: ${concern}`);
  for (const field of ["reference", "commodity", "trailerType"] as const) {
    if (!hasText(load[field])) issues.push(`${field} is required.`);
  }
  if (!load.collectionMethod)
    issues.push("collectionMethod must be confirmed.");
  if (load.currency !== "USD")
    issues.push(
      "This starter requires USD pricing; extend the currency mapping for other currencies."
    );
  if (
    load.weightLb === null ||
    !Number.isFinite(load.weightLb) ||
    load.weightLb <= 0
  )
    issues.push("weightLb must be a positive number in pounds.");
  if (
    load.linehaul === null ||
    !Number.isFinite(load.linehaul) ||
    load.linehaul <= 0
  )
    issues.push("linehaul must be a positive charge.");
  if (
    load.pieces !== null &&
    (!Number.isInteger(load.pieces) || load.pieces <= 0)
  )
    issues.push("pieces must be a positive integer.");
  if (load.hazmat === null)
    issues.push("hazmat must be confirmed as true or false.");
  if (load.hazmat && !hasText(load.hazmatId))
    issues.push("Hazardous loads require a hazmatId.");
  const temperatures = [load.temperatureLowF, load.temperatureHighF];
  if (
    load.trailerType === "R" ||
    temperatures.some((value) => value !== null)
  ) {
    if (
      temperatures.some(
        (value) => value === null || !Number.isInteger(value)
      ) ||
      load.temperatureLowF! > load.temperatureHighF!
    ) {
      issues.push(
        "Temperature-controlled freight requires an ordered integer temperature range in Fahrenheit."
      );
    }
  }
  if (
    load.stops.length < 2 ||
    load.stops[0]?.stopType !== "Pickup" ||
    load.stops.at(-1)?.stopType !== "Delivery"
  ) {
    issues.push("Stops must start with a pickup and end with a delivery.");
  }
  let previousEarly = -Infinity;
  for (const [index, stop] of load.stops.entries()) {
    const prefix = `Stop ${index + 1}`;
    for (const field of [
      "locationName",
      "address",
      "city",
      "state",
      "postalCode",
    ] as const) {
      if (!hasText(stop[field]))
        issues.push(`${prefix}: ${field} is required.`);
    }
    if (!/^[A-Z]{2}$/.test(stop.state ?? ""))
      issues.push(`${prefix}: state must be a two-letter code.`);
    if (!validTime(stop.arrivalEarly) || !validTime(stop.arrivalLate)) {
      issues.push(
        `${prefix}: arrival window requires valid ISO dates with explicit UTC offsets.`
      );
    } else {
      const early = Date.parse(stop.arrivalEarly!);
      const late = Date.parse(stop.arrivalLate!);
      if (early > late) issues.push(`${prefix}: arrival window is reversed.`);
      if (early < previousEarly)
        issues.push(`${prefix}: stop dates are out of sequence.`);
      previousEarly = early;
    }
  }
  return issues;
}
