import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import { useController, type Control } from "react-hook-form";
import { FileUp, X } from "lucide-react";

import type { CommandFormValues } from "../../lib/command-form";
import { cn } from "../../lib/utils";
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
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);
  const dragDepth = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
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
    if (!selected.length) return;
    const current = ++revision.current;
    readingRef.current = true;
    errorRef.current = null;
    setReading(true);
    setError(null);
    try {
      if (
        config.multiple &&
        config.maxFiles !== undefined &&
        files.length + selected.length > config.maxFiles
      ) {
        throw new Error(`Choose at most ${config.maxFiles} file(s).`);
      }
      const encoded = await encodeFiles(selected, {
        ...config,
        maxFiles: config.multiple ? undefined : config.maxFiles,
      });
      if (current !== revision.current) return;
      binding.onChange(
        config.multiple ? [...files, ...encoded] : encoded[0] ?? null,
      );
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

  const unavailable = disabled || reading;

  function dragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (unavailable) return;
    dragDepth.current += 1;
    setDragging(true);
  }

  function dragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (!dragDepth.current) setDragging(false);
  }

  function dropFiles(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = 0;
    setDragging(false);
    if (unavailable) return;
    void selectFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <div className="space-y-2">
      {label}
      <div
        onDragEnter={dragEnter}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!unavailable) event.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={dragLeave}
        onDrop={dropFiles}
        className={cn(
          "space-y-3 rounded-md border border-dashed p-3 transition-colors",
          dragging
            ? "border-primary bg-primary/5"
            : "border-input bg-background",
          unavailable && "opacity-60",
        )}
      >
        <input
          id={`command-${field.name}`}
          ref={(element) => {
            binding.ref(element);
            inputRef.current = element;
          }}
          type="file"
          accept={config.accept || undefined}
          multiple={config.multiple}
          disabled={unavailable}
          onBlur={binding.onBlur}
          onChange={(event) => {
            void selectFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
          aria-describedby={`command-${field.name}-limits`}
          aria-invalid={Boolean(error || fieldState.error)}
          className="sr-only"
        />
        <button
          type="button"
          disabled={unavailable}
          autoFocus={autoFocus}
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-sm px-4 py-5 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
        >
          <FileUp className="size-6 text-muted-foreground" />
          <span className="text-sm font-medium">
            {reading
              ? "Reading files…"
              : dragging
                ? `Drop ${config.multiple ? "files" : "the file"} here`
                : `Drop ${config.multiple ? "files" : "a file"} here or browse`}
          </span>
          <span
            id={`command-${field.name}-limits`}
            className="text-xs text-muted-foreground"
          >
            {config.accept ? `${config.accept} · ` : ""}
            {formatBytes(config.maxBytes)} per file
            {config.maxFiles ? ` · Up to ${config.maxFiles} file(s)` : ""}
          </span>
        </button>
        {files.length ? (
          <ul className="space-y-1 border-t border-border pt-3">
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
