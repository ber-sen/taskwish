import type { ConsoleInputField, ConsoleJsonSchema } from "../types";

export type UploadedFileValue = {
  name: string;
  contentBase64: string;
};
export type FileInputConfig = {
  multiple: boolean;
  accept: string;
  maxBytes: number;
  maxFiles?: number;
};

export function fileInputConfig(
  field: ConsoleInputField,
): FileInputConfig | undefined {
  const multiple = field.schema?.type === "array";
  const schema = multiple
    ? (field.schema?.items as ConsoleJsonSchema | undefined)
    : field.schema;
  if (schema?.format !== "taskwish-file") return undefined;
  return {
    multiple,
    accept:
      typeof schema["x-taskwish-accept"] === "string"
        ? schema["x-taskwish-accept"]
        : "",
    maxBytes:
      typeof schema["x-taskwish-max-bytes"] === "number"
        ? schema["x-taskwish-max-bytes"]
        : 10_000_000,
    maxFiles:
      multiple && typeof field.schema?.maxItems === "number"
        ? field.schema.maxItems
        : multiple
          ? undefined
          : 1,
  };
}

export function acceptsFile(
  file: Pick<File, "name" | "type">,
  accept: string,
): boolean {
  if (!accept.trim()) return true;
  return accept
    .toLowerCase()
    .split(",")
    .some((entry) => {
      const rule = entry.trim();
      if (rule.startsWith(".")) return file.name.toLowerCase().endsWith(rule);
      if (rule.endsWith("/*")) {
        return file.type.toLowerCase().startsWith(rule.slice(0, -1));
      }
      return file.type.toLowerCase() === rule;
    });
}

export async function encodeFiles(
  files: readonly File[],
  config: FileInputConfig,
): Promise<UploadedFileValue[]> {
  if (config.maxFiles !== undefined && files.length > config.maxFiles) {
    throw new Error(`Choose at most ${config.maxFiles} file(s).`);
  }
  for (const file of files) {
    if (!acceptsFile(file, config.accept)) {
      throw new Error(`${file.name}: choose ${config.accept} files.`);
    }
    if (!file.size) throw new Error(`${file.name} is empty.`);
    if (file.size > config.maxBytes) {
      throw new Error(
        `${file.name} exceeds the ${formatBytes(config.maxBytes)} limit.`,
      );
    }
  }
  return Promise.all(
    files.map(async (file) => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 8192) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
      }
      return { name: file.name, contentBase64: btoa(binary) };
    }),
  );
}

export function parseUploadedFiles(
  field: ConsoleInputField,
  value: unknown,
): UploadedFileValue | UploadedFileValue[] | undefined {
  const config = fileInputConfig(field)!;
  const values = config.multiple
    ? Array.isArray(value)
      ? value
      : []
    : value
      ? [value]
      : [];
  if (!values.length) {
    if (field.required) throw new Error(`Choose a file for ${field.name}.`);
    return undefined;
  }
  if (config.maxFiles !== undefined && values.length > config.maxFiles) {
    throw new Error(`Choose at most ${config.maxFiles} file(s).`);
  }
  for (const file of values) {
    if (
      !file ||
      typeof file !== "object" ||
      typeof file.name !== "string" ||
      !file.name ||
      typeof file.contentBase64 !== "string" ||
      !file.contentBase64
    ) {
      throw new Error(`Choose a valid file for ${field.name}.`);
    }
  }
  return config.multiple ? values : values[0];
}

export function formatBytes(bytes: number): string {
  return bytes >= 1_000_000
    ? `${Number((bytes / 1_000_000).toFixed(1))} MB`
    : `${Math.ceil(bytes / 1000)} KB`;
}
