import { randomUUID } from "node:crypto";

import type { Load } from "./load";
import type { Job } from "./records";

export function sampleLoad(): Load {
  return {
    reference: "BOL-1042",
    commodity: "Packaged paper",
    trailerType: "V",
    hazmat: false,
    hazmatId: null,
    temperatureLowF: null,
    temperatureHighF: null,
    weightLb: 24000,
    pieces: 24,
    linehaul: 1850,
    currency: "USD",
    collectionMethod: "PrePaid",
    instructions: "Call 30 minutes before arrival.",
    concerns: [],
    stops: [
      {
        stopType: "Pickup",
        locationId: null,
        locationName: "Chicago Paper",
        address: "100 Paper St",
        city: "Chicago",
        state: "IL",
        postalCode: "60601",
        arrivalEarly: "2026-10-12T08:00:00-05:00",
        arrivalLate: "2026-10-12T10:00:00-05:00",
      },
      {
        stopType: "Delivery",
        locationId: null,
        locationName: "Atlanta Warehouse",
        address: "200 Warehouse Rd",
        city: "Atlanta",
        state: "GA",
        postalCode: "30301",
        arrivalEarly: "2026-10-13T09:00:00-04:00",
        arrivalLate: "2026-10-13T11:00:00-04:00",
      },
    ],
  };
}

export function mockState() {
  const jobs: Job[] = [];
  jobs.push = (...items: Job[]) =>
    Array.prototype.push.apply(
      jobs,
      items.map((item) => ({ ...item, id: item.id ?? randomUUID() }))
    );
  return { jobs };
}

export function samplePdf(text = "Freight tender BOL-1042") {
  const stream = `BT /F1 12 Tf 50 750 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const start = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return Buffer.from(pdf).toString("base64");
}
