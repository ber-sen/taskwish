import { type, type Type as ArkType } from "arktype";

/** JSON-safe file data sent by Console and other action clients. */
export type UploadedFile = {
  name: string;
  contentBase64: string;
};

export type FileInputOptions = {
  /** File-picker extensions or MIME types, for example ".pdf,.docx". */
  accept?: string;
  /** Per-file byte limit. Consumers should also enforce decoded/total limits. */
  maxBytes?: number;
};

function File(options: FileInputOptions = {}): ArkType<UploadedFile> {
  const maxBytes = options.maxBytes ?? 10_000_000;
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new Error("Input.File maxBytes must be a positive safe integer.");
  }
  const metadata = {
    format: "taskwish-file",
    "x-taskwish-accept": options.accept ?? "",
    "x-taskwish-max-bytes": maxBytes,
  };
  return type({
    name: "string > 0",
    contentBase64: type("string > 0")
      .matching(
        /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
      )
      .atMostLength(Math.ceil(maxBytes / 3) * 4),
  }).configure(metadata);
}

function List<const Schema>(
  ...arg: [type.validate<Schema>]
): ArkType<type.infer<Schema>[]>;

function List(...arg: [unknown]): ArkType<unknown[]> {
  return type(arg[0] as never).array() as ArkType<unknown[]>;
}

export const Input = {
  List,
  File,
};
