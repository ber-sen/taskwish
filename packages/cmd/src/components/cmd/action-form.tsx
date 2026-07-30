import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";

import { Button } from "../ui/button";
import {
  buildPayload,
  formDefaultValues,
  parseActionResponse,
  type ActionRunResult,
  type CommandFormValues,
} from "../../lib/command-form";
import type { CommandCenterAction, CommandCenterConfig } from "../../types";
import { ActionInputField } from "./action-input-field";
import { ActionResult } from "./action-result";

export function ActionForm({
  action,
  config,
}: {
  action: CommandCenterAction;
  config: CommandCenterConfig;
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ActionRunResult | null>(null);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const form = useForm<CommandFormValues>({
    defaultValues: formDefaultValues(action.input),
  });

  useEffect(() => {
    setError(null);
    setResult(null);
    setShowOptionalFields(false);
    form.reset(formDefaultValues(action.input));
  }, [action.id, action.input, form]);

  const requiredFields = action.input.filter((field) => field.required);
  const optionalFields = action.input.filter((field) => !field.required);
  const visibleFields = showOptionalFields
    ? action.input
    : requiredFields.length
      ? requiredFields
      : [];

  const submit: SubmitHandler<CommandFormValues> = async (values) => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const payload = buildPayload(values, visibleFields);
      const response = await fetch(action.route, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      setResult(await parseActionResponse(response));
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <form
      id="cmd-action-form"
      className="space-y-4"
      onSubmit={form.handleSubmit(submit)}
    >
      {visibleFields.map((field, index) => (
        <ActionInputField
          key={field.name}
          field={field}
          disabled={isRunning}
          autoFocus={index === 0}
          register={form.register}
          control={form.control}
        />
      ))}
      {optionalFields.length ? (
        <Button
          type="button"
          variant="ghost"
          className="h-9 pl-0 pr-3 hover:bg-transparent hover:text-inherit focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
          disabled={isRunning}
          onClick={() => setShowOptionalFields((value) => !value)}
        >
          {showOptionalFields ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          {showOptionalFields ? "Hide options" : "Show more options"}
        </Button>
      ) : null}
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {result ? <ActionResult result={result} /> : null}
      <input type="submit" hidden disabled={isRunning} />
    </form>
  );
}
