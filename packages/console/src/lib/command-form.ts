import type { ConsoleInputField, ConsoleJsonSchema } from "../types";
import { sentenceFromIdentifier, uppercaseFirst } from "./console-text";

export type ActionRunResult = {
  status: number;
  ok: boolean;
  contentType: string;
  body: unknown;
};

export type CommandFormValues = Record<string, unknown>;
export type ListItemValue = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function schemaType(
  schema: ConsoleJsonSchema | undefined
): string | undefined {
  if (Array.isArray(schema?.type)) {
    return schema.type.find((value) => value !== "null");
  }
  return schema?.type;
}

export function arrayItemSchema(
  schema: ConsoleJsonSchema | undefined
): ConsoleJsonSchema | undefined {
  return Array.isArray(schema?.items) ? schema.items[0] : schema?.items;
}

export function objectSchemaFields(
  schema: ConsoleJsonSchema | undefined
): ConsoleInputField[] {
  if (!isRecord(schema?.properties)) return [];

  return Object.entries(schema.properties).map(([name, property]) => ({
    name,
    required: schema.required?.includes(name),
    schema: property,
    description:
      typeof property.description === "string"
        ? property.description
        : undefined,
    example: property.examples?.[0],
    defaultValue: "default" in property ? property.default : undefined,
  }));
}

export function enumValue(value: unknown): string {
  return typeof value === "string"
    ? value
    : JSON.stringify(value) ?? String(value);
}

export function listItemDefaultValue(field: ConsoleInputField): ListItemValue {
  const itemSchema = arrayItemSchema(field.schema);
  const itemType = schemaType(itemSchema);
  if (itemType === "object") {
    return Object.fromEntries(
      objectSchemaFields(itemSchema).map((property) => [
        property.name,
        rawFieldDefaultValue(property),
      ])
    );
  }
  if (itemType === "boolean") return { value: false };
  return { value: "" };
}

function rawFieldDefaultValue(field: ConsoleInputField): unknown {
  if (field.defaultValue !== undefined) return field.defaultValue;
  if (field.example !== undefined) return field.example;

  const type = schemaType(field.schema);
  if (type === "boolean") return false;
  if (type === "array") return [];
  return "";
}

function fieldFormDefaultValue(field: ConsoleInputField): unknown {
  const type = schemaType(field.schema);
  const rawValue = rawFieldDefaultValue(field);

  if (type !== "array") return rawValue;

  const values = Array.isArray(rawValue) ? rawValue : [];
  return values.map((value) => {
    if (schemaType(arrayItemSchema(field.schema)) === "object") {
      return isRecord(value) ? value : listItemDefaultValue(field);
    }
    return {
      value:
        typeof value === "object" && value !== null
          ? JSON.stringify(value, null, 2)
          : value,
    };
  });
}

export function formDefaultValues(
  fields: ConsoleInputField[]
): CommandFormValues {
  return Object.fromEntries(
    fields.map((field) => [field.name, fieldFormDefaultValue(field)])
  );
}

function isJsonField(field: ConsoleInputField): boolean {
  const type = schemaType(field.schema);
  return type === "object" || type === "array" || !type;
}

export function fieldPlaceholder(field: ConsoleInputField): string {
  const type = schemaType(field.schema);
  if (field.example !== undefined) {
    const placeholder =
      typeof field.example === "string"
        ? field.example
        : JSON.stringify(field.example) ?? String(field.example);
    return uppercaseFirst(placeholder);
  }
  if (type === "number" || type === "integer") return "0";
  if (type === "boolean") return "";
  if (type === "string") return sentenceFromIdentifier(field.name);
  return "JSON";
}

function parseJsonValue(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function parseFieldValue(field: ConsoleInputField, value: unknown): unknown {
  const type = schemaType(field.schema);
  const raw = String(value ?? "");
  const trimmed = raw.trim();
  const enumValues = field.schema?.enum;

  if (type === "boolean") return Boolean(value);
  if (!trimmed) return undefined;

  if (Array.isArray(enumValues)) {
    const enumValueMatch = enumValues.find((item) => enumValue(item) === raw);
    if (enumValueMatch !== undefined) return enumValueMatch;
  }

  if (type === "number" || type === "integer") {
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) {
      throw new Error(`${field.name} must be a number`);
    }
    return parsed;
  }

  if (type === "string") return raw;

  if (isJsonField(field)) {
    try {
      return JSON.parse(trimmed);
    } catch {
      throw new Error(`${field.name} must be valid JSON`);
    }
  }

  return parseJsonValue(raw);
}

function parseListItemValue(field: ConsoleInputField, value: unknown): unknown {
  const itemSchema = arrayItemSchema(field.schema);
  if (schemaType(itemSchema) === "object") {
    const row = isRecord(value) ? value : {};
    const parsedRow: Record<string, unknown> = {};

    for (const property of objectSchemaFields(itemSchema)) {
      const parsed = parseFieldValue(property, row[property.name]);
      if (parsed !== undefined) parsedRow[property.name] = parsed;
    }

    return Object.keys(parsedRow).length ? parsedRow : undefined;
  }

  const itemField: ConsoleInputField = {
    ...field,
    schema: itemSchema,
  };
  return parseFieldValue(itemField, value);
}

function parseListValue(
  field: ConsoleInputField,
  value: unknown
): unknown[] | undefined {
  const rows = Array.isArray(value) ? value : [];
  const parsedRows = rows
    .map((row) => (isRecord(row) && "value" in row ? row.value : row))
    .map((row) => parseListItemValue(field, row))
    .filter((row) => row !== undefined);

  if (field.required) return parsedRows;
  return parsedRows.length ? parsedRows : undefined;
}

function parseCommandFieldValue(
  field: ConsoleInputField,
  value: unknown
): unknown {
  return schemaType(field.schema) === "array"
    ? parseListValue(field, value)
    : parseFieldValue(field, value);
}

export function buildPayload(
  values: CommandFormValues,
  fields: ConsoleInputField[]
) {
  if (fields.length === 1 && fields[0]?.name === "input") {
    const parsed = parseCommandFieldValue(fields[0], values.input);
    return parsed === undefined ? {} : parsed;
  }

  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const parsed = parseCommandFieldValue(field, values[field.name]);
    if (parsed !== undefined) payload[field.name] = parsed;
  }
  return payload;
}

export async function parseActionResponse(
  response: Response
): Promise<ActionRunResult> {
  const contentType = response.headers.get("Content-Type") ?? "";
  const body =
    response.status === 204
      ? null
      : contentType.includes("application/json")
      ? await response.json()
      : await response.text();

  return {
    status: response.status,
    ok: response.ok,
    contentType,
    body,
  };
}

export function formatActionResultBody(body: unknown): string {
  if (body === null) return "null";
  if (body === undefined) return "";
  if (typeof body === "string") return body;
  return JSON.stringify(body, null, 2);
}
