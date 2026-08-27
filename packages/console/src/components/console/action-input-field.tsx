import { useEffect, useMemo, useState } from "react";
import type { Control, UseFormRegister } from "react-hook-form";

import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { PromptInputTextarea } from "../ai-elements/prompt-input";
import {
  enumValue,
  fieldPlaceholder,
  parseActionResponse,
  schemaType,
  type CommandFormValues,
} from "../../lib/command-form";
import { sentenceFromIdentifier } from "../../lib/console-text";
import type { ConsoleConfig, ConsoleInputField } from "../../types";
import {
  actionResultValue,
  actionSuggestion,
  actionSuggestionOptions,
  type ActionSuggestionOption,
} from "../../lib/action-suggestions";
import { FieldDescription } from "./field-description";
import { ListInputField } from "./list-input-field";

export function ActionInputField({
  field,
  disabled,
  autoFocus,
  register,
  control,
  config,
}: {
  field: ConsoleInputField;
  disabled: boolean;
  autoFocus?: boolean;
  register: UseFormRegister<CommandFormValues>;
  control: Control<CommandFormValues>;
  config: ConsoleConfig;
}) {
  const id = `command-${field.name}`;
  const type = schemaType(field.schema);
  const enumValues = field.schema?.enum;
  const suggestion = useMemo(
    () => actionSuggestion(field, config.actions),
    [config.actions, field],
  );
  const [suggestionOptions, setSuggestionOptions] = useState<
    ActionSuggestionOption[]
  >([]);
  const [suggestionStatus, setSuggestionStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >(suggestion ? "loading" : "idle");

  useEffect(() => {
    if (!suggestion) {
      setSuggestionOptions([]);
      setSuggestionStatus("idle");
      return;
    }

    const abortController = new AbortController();
    setSuggestionStatus("loading");

    void fetch(suggestion.action.route, {
      method: "POST",
      headers: {
        Accept: "text/event-stream, application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        wire: "commander",
      },
      signal: abortController.signal,
      body: JSON.stringify(suggestion.payload),
    })
      .then(parseActionResponse)
      .then((result) => {
        if (!result.ok) {
          throw new Error(`Suggestion action failed: ${result.status}`);
        }
        setSuggestionOptions(
          actionSuggestionOptions(
            actionResultValue(result),
            suggestion.selector,
          ),
        );
        setSuggestionStatus("ready");
      })
      .catch(() => {
        if (!abortController.signal.aborted) setSuggestionStatus("error");
      });

    return () => abortController.abort();
  }, [config.apiKey, suggestion]);
  const fieldLabel = sentenceFromIdentifier(field.name);
  const label = (
    <Label htmlFor={id} className="flex items-center gap-1">
      {fieldLabel}
      {field.required ? <span className="text-muted-foreground">*</span> : null}
    </Label>
  );

  if (type === "array") {
    return (
      <ListInputField
        field={field}
        disabled={disabled}
        autoFocus={autoFocus}
        register={register}
        control={control}
        label={label}
      />
    );
  }

  if (suggestion) {
    const placeholder =
      suggestionStatus === "loading"
        ? "Loading..."
        : suggestionStatus === "error"
          ? "Unable to load options"
          : suggestionOptions.length
            ? "Select..."
            : "No options";

    return (
      <div className="space-y-2">
        {label}
        <select
          id={id}
          disabled={disabled || suggestionStatus !== "ready"}
          autoFocus={autoFocus}
          {...register(field.name)}
          className="flex h-[38px] w-full rounded-md border border-input bg-transparent px-2 py-1 text-base transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">{placeholder}</option>
          {suggestionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <FieldDescription field={field} />
      </div>
    );
  }

  if (Array.isArray(enumValues)) {
    return (
      <div className="space-y-2">
        {label}
        <select
          id={id}
          disabled={disabled}
          autoFocus={autoFocus}
          {...register(field.name)}
          className="flex h-[38px] w-full rounded-md border border-input bg-transparent px-2 py-1 text-base transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {!field.required ? <option value="">Select...</option> : null}
          {enumValues.map((value) => (
            <option key={enumValue(value)} value={enumValue(value)}>
              {enumValue(value)}
            </option>
          ))}
        </select>
        <FieldDescription field={field} />
      </div>
    );
  }

  if (type === "boolean") {
    return (
      <div className="space-y-2">
        <label
          htmlFor={id}
          className="flex items-center gap-2 text-sm font-medium"
        >
          <input
            id={id}
            type="checkbox"
            disabled={disabled}
            autoFocus={autoFocus}
            {...register(field.name)}
            className="h-4 w-4 rounded border border-input accent-primary disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span>
            {fieldLabel}
            {field.required ? (
              <span className="ml-1 text-muted-foreground">*</span>
            ) : null}
          </span>
        </label>
        <FieldDescription field={field} />
      </div>
    );
  }

  if (type === "string" || type === "number" || type === "integer") {
    return (
      <div className="space-y-2">
        {label}
        <Input
          id={id}
          type={type === "string" ? "text" : "number"}
          step={type === "integer" ? "1" : "any"}
          placeholder={fieldPlaceholder(field)}
          disabled={disabled}
          autoFocus={autoFocus}
          {...register(field.name)}
        />
        <FieldDescription field={field} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label}
      <PromptInputTextarea
        id={id}
        placeholder={fieldPlaceholder(field)}
        className="min-h-[110px] resize-none"
        disabled={disabled}
        autoFocus={autoFocus}
        {...register(field.name)}
      />
      <FieldDescription field={field} />
    </div>
  );
}
