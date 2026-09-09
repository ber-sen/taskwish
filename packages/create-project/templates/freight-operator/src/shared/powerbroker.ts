import { parseLoad, validateLoad, type Load } from "./load";

export type OrderResult = {
  requestId: string;
  orderId: string;
  action: string;
  reason: string;
  reference: string;
};

export function powerBrokerConfig() {
  const baseUrl =
    process.env.MCLEOD_BASE_URL ||
    "https://api.mcleodsoftware.com/ordercreation-sandbox";
  const url = new URL(baseUrl);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "MCLEOD_BASE_URL must be an HTTPS API base URL without credentials, query, or fragment."
    );
  }
  const authorization = process.env.MCLEOD_AUTHORIZATION;
  const apiKey = process.env.MCLEOD_API_KEY;
  const tenant = process.env.MCLEOD_TENANT;
  if (!authorization || !apiKey || !tenant)
    throw new Error(
      "MCLEOD_AUTHORIZATION, MCLEOD_API_KEY, and MCLEOD_TENANT are required."
    );
  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    headers: {
      Authorization: authorization,
      "X-Api-Key": apiKey,
      "X-Mcld-Tenant": tenant,
      ...(process.env.MCLEOD_FUSION_PROFILE
        ? { "X-Mcld-Fusion-Profile": process.env.MCLEOD_FUSION_PROFILE }
        : {}),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  };
}

export function mapOrderRequest(load: Load) {
  const issues = validateLoad(parseLoad(load));
  if (issues.length) throw new Error(`Load is not ready: ${issues.join(" ")}`);
  return {
    orderReferenceNumbers: { bol: load.reference },
    commodity: {
      name: load.commodity,
      hazmat: load.hazmat,
      ...(load.hazmatId ? { hazmatId: load.hazmatId } : {}),
      ...(load.temperatureLowF !== null
        ? {
            temperatureRange: {
              low: load.temperatureLowF,
              high: load.temperatureHighF,
            },
          }
        : {}),
    },
    equipmentDetails: { trailerType: load.trailerType },
    rating: {
      collectionMethod: load.collectionMethod,
      rateType: "Flat",
      units: 1,
      rate: load.linehaul,
      linehaulCharge: { value: load.linehaul, currency: load.currency },
      weight: load.weightLb,
      ...(load.pieces !== null ? { pieces: load.pieces } : {}),
    },
    planningComment: load.instructions ?? "",
    stops: load.stops.map((stop) => ({
      ...(stop.locationId ? { locationId: stop.locationId } : {}),
      locationName: stop.locationName,
      address: stop.address,
      cityName: stop.city,
      state: stop.state,
      zipCode: stop.postalCode,
      scheduledArrivalEarly: stop.arrivalEarly,
      scheduledArrivalLate: stop.arrivalLate,
      stopType: stop.stopType,
    })),
  };
}

async function readResult(response: Response): Promise<OrderResult> {
  if (!response.ok)
    throw new Error(`McLeod request failed (HTTP ${response.status}).`);
  const value = (await response.json()) as {
    requestId?: unknown;
    orderReferenceNumbers?: { bol?: unknown };
    status?: { orderId?: unknown; action?: unknown; reason?: unknown };
  };
  if (typeof value.requestId !== "string" || !value.requestId.trim())
    throw new Error(
      "McLeod response did not include a requestId; reconcile before retrying."
    );
  const status = value.status;
  return {
    requestId: value.requestId,
    orderId: typeof status?.orderId === "string" ? status.orderId.trim() : "",
    action: typeof status?.action === "string" ? status.action : "",
    reason: typeof status?.reason === "string" ? status.reason : "",
    reference:
      typeof value.orderReferenceNumbers?.bol === "string"
        ? value.orderReferenceNumbers.bol.trim()
        : "",
  };
}

// Kept out of the public actor service: only approval can invoke this write.
export async function submitOrderRequest(
  customerId: string,
  correlationId: string,
  payload: ReturnType<typeof mapOrderRequest>,
  config: ReturnType<typeof powerBrokerConfig>
) {
  const response = await fetch(
    `${config.baseUrl}/customers/${encodeURIComponent(
      customerId
    )}/order-requests`,
    {
      method: "POST",
      headers: { ...config.headers, "X-Correlation-Id": correlationId },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
      redirect: "error",
    }
  );
  // McLeod does not document an idempotency key. Never blindly repeat this POST.
  return readResult(response);
}

export async function getOrderRequest(
  customerId: string,
  requestId: string
): Promise<OrderResult> {
  const config = powerBrokerConfig();
  const response = await fetch(
    `${config.baseUrl}/customers/${encodeURIComponent(
      customerId
    )}/order-requests/${encodeURIComponent(requestId)}`,
    {
      headers: config.headers,
      signal: AbortSignal.timeout(30_000),
      redirect: "error",
    }
  );
  const result = await readResult(response);
  if (result.requestId !== requestId)
    throw new Error("McLeod returned a different request ID.");
  return result;
}
