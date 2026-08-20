import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "../ui/button";
import {
  buildPayload,
  formDefaultValues,
  streamActionResponse,
  type ActionRunResult,
  type CommandFormValues,
} from "../../lib/command-form";
import type { ConsoleAction, ConsoleConfig } from "../../types";
import { ActionInputField } from "./action-input-field";
import { ActionResult } from "./action-result";

export type ActionFormHandle = {
  cancel: () => void;
};

export const ActionForm = forwardRef<
  ActionFormHandle,
  {
    action: ConsoleAction;
    config: ConsoleConfig;
    showLogs: boolean;
    onChatModeChange?: (enabled: boolean) => void;
    onRunStateChange?: (running: boolean) => void;
  }
>(function ActionForm(
  {
    action,
    config,
    showLogs,
    onChatModeChange,
    onRunStateChange,
  },
  ref
) {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ActionRunResult | null>(null);
  const [submittedPayload, setSubmittedPayload] = useState<unknown>(null);
  const [isChatMode, setIsChatMode] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const onChatModeChangeRef = useRef(onChatModeChange);
  const onRunStateChangeRef = useRef(onRunStateChange);
  const form = useForm<CommandFormValues>({
    defaultValues: formDefaultValues(action.input),
  });

  useEffect(() => {
    onChatModeChangeRef.current = onChatModeChange;
    onRunStateChangeRef.current = onRunStateChange;
  }, [onChatModeChange, onRunStateChange]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  useImperativeHandle(ref, () => ({ cancel }), [cancel]);

  useEffect(() => {
    setError(null);
    setResult(null);
    setSubmittedPayload(null);
    setIsChatMode(false);
    onChatModeChangeRef.current?.(false);
    onRunStateChangeRef.current?.(false);
    setShowOptionalFields(false);
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
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
    onRunStateChangeRef.current?.(true);
    setError(null);
    setResult(null);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const payload = buildPayload(values, visibleFields);
      setSubmittedPayload(payload);
      setIsChatMode(true);
      onChatModeChangeRef.current?.(true);
      let finalResult: ActionRunResult | null = null;
      const response = await fetch(action.route, {
        method: "POST",
        headers: {
          Accept: "text/event-stream, application/json",
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          wire: "commander",
        },
        signal: abortController.signal,
        body: JSON.stringify(payload),
      });
      for await (const result of streamActionResponse(response)) {
        finalResult = result;
        setResult(result);
      }
      if (finalResult?.ok) {
        toast.success(`${action.label} finished`, {
          description: `${finalResult.status}`,
        });
      } else if (finalResult) {
        toast.error(`${action.label} failed`, {
          description: `${finalResult.status}`,
        });
      }
    } catch (error) {
      if (abortController.signal.aborted) {
        setError(null);
        setResult({
          status: 0,
          ok: false,
          contentType: "text/plain",
          body: "Cancelled",
        });
        return;
      }

      const message = error instanceof Error ? error.message : String(error);
      setError(message);
      setResult({
        status: 0,
        ok: false,
        contentType: "text/plain",
        body: message,
      });
      toast.error(`${action.label} failed`, {
        description: message,
      });
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      setIsRunning(false);
      onRunStateChangeRef.current?.(false);
    }
  };

  return (
    <>
      <form
        id="console-action-form"
        className={isChatMode ? "hidden" : "space-y-4"}
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
        <input type="submit" hidden disabled={isRunning} />
      </form>
      {isChatMode ? (
        <ActionResult
          className="h-full min-h-0 flex-1"
          input={submittedPayload}
          result={result}
          showLogs={showLogs}
        />
      ) : null}
    </>
  );
});
ActionForm.displayName = "ActionForm";
