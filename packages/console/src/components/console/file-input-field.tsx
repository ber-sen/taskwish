import { useEffect, useRef, useState, type ReactNode } from "react";
import { useController, type Control } from "react-hook-form";
import { FileUp, X } from "lucide-react";

import type { CommandFormValues } from "../../lib/command-form";
import {
  encodeFiles,
  fileInputConfig,
  formatBytes,
  type UploadedFileValue,
} from "../../lib/file-input";
import type { ConsoleInputField } from "../../types";
import { FieldDescription } from "./field-description";

export function FileInputField({
  field,
  control,
  disabled,
  autoFocus,
  label,
}: {
  field: ConsoleInputField;
  control: Control<CommandFormValues>;
  disabled: boolean;
  autoFocus?: boolean;
  label: ReactNode;
}) {
  const config = fileInputConfig(field)!;
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);
  const readingRef = useRef(false);
  const errorRef = useRef<string | null>(null);
  const { field: binding, fieldState } = useController({
    name: field.name,
    control,
    rules: {
      validate: (value) =>
        readingRef.current
          ? "Wait for files to finish loading."
          : errorRef.current ||
            (!field.required ||
              (config.multiple
                ? Array.isArray(value) && value.length > 0
                : Boolean(value)) ||
              "Choose a file."),
    },
  });
  const files: UploadedFileValue[] = config.multiple
    ? Array.isArray(binding.value)
      ? binding.value
      : []
    : binding.value
      ? [binding.value]
      : [];

  useEffect(
    () => () => {
      revision.current += 1;
    },
    [],
  );

  async function selectFiles(selected: File[]) {
    const current = ++revision.current;
    readingRef.current = true;
    errorRef.current = null;
    setReading(true);
    setError(null);
    binding.onChange(config.multiple ? [] : null);
    try {
      const encoded = await encodeFiles(selected, config);
      if (current !== revision.current) return;
      binding.onChange(config.multiple ? encoded : encoded[0] ?? null);
    } catch (cause) {
      if (current !== revision.current) return;
      const message =
        cause instanceof Error ? cause.message : "Unable to read document.";
      errorRef.current = message;
      setError(message);
    } finally {
      if (current === revision.current) {
        readingRef.current = false;
        setReading(false);
      }
    }
  }

  return (
    <div className="space-y-2">
      {label}
      <div className="space-y-3 rounded-md border border-dashed border-input p-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileUp className="size-4" />
          {reading
            ? "Reading files…"
            : `Choose ${config.multiple ? "files" : "a file"} to upload`}
        </div>
        <input
          id={`command-${field.name}`}
          ref={binding.ref}
          type="file"
          accept={config.accept || undefined}
          multiple={config.multiple}
          disabled={disabled || reading}
          autoFocus={autoFocus}
          onBlur={binding.onBlur}
          onChange={(event) => {
            void selectFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
          aria-describedby={`command-${field.name}-limits`}
          aria-invalid={Boolean(error || fieldState.error)}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm disabled:opacity-50"
        />
        <p
          id={`command-${field.name}-limits`}
          className="text-xs text-muted-foreground"
        >
          {formatBytes(config.maxBytes)} per file
          {config.maxFiles ? ` · Up to ${config.maxFiles} file(s)` : ""}
        </p>
        {files.length ? (
          <ul className="space-y-1">
            {files.map((file, index) => (
              <li
                key={`${file.name}:${index}`}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  disabled={disabled || reading}
                  onClick={() => {
                    const remaining = files.filter(
                      (_, position) => position !== index,
                    );
                    binding.onChange(config.multiple ? remaining : null);
                  }}
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {error || fieldState.error ? (
        <p role="alert" className="text-sm text-destructive">
          {error || fieldState.error?.message}
        </p>
      ) : null}
      <FieldDescription field={field} />
    </div>
  );
}
