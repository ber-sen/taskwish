import { Plus, Trash2 } from "lucide-react";
import {
  useFieldArray,
  type Control,
  type FieldValues,
  type UseFormRegister,
} from "react-hook-form";
import type { ReactNode } from "react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  arrayItemSchema,
  enumValue,
  fieldPlaceholder,
  listItemDefaultValue,
  objectSchemaFields,
  schemaType,
  type CommandFormValues,
} from "../../lib/command-form";
import { sentenceFromIdentifier } from "../../lib/command-center-text";
import type { CommandCenterInputField } from "../../types";
import { FieldDescription } from "./field-description";

function ObjectPropertyInput({
  field,
  name,
  id,
  disabled,
  autoFocus,
  register,
}: {
  field: CommandCenterInputField;
  name: string;
  id: string;
  disabled: boolean;
  autoFocus?: boolean;
  register: UseFormRegister<CommandFormValues>;
}) {
  const type = schemaType(field.schema);
  const enumValues = field.schema?.enum;
  const label = (
    <Label htmlFor={id} className="flex items-center gap-1">
      {sentenceFromIdentifier(field.name)}
      {field.required ? <span className="text-muted-foreground">*</span> : null}
    </Label>
  );

  if (Array.isArray(enumValues)) {
    return (
      <div className="space-y-2">
        {label}
        <select
          id={id}
          disabled={disabled}
          autoFocus={autoFocus}
          {...register(name)}
          className="flex h-[38px] w-full rounded-md border border-input bg-transparent px-2 py-1 text-base transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
        <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium">
          <input
            id={id}
            type="checkbox"
            disabled={disabled}
            autoFocus={autoFocus}
            {...register(name)}
            className="h-4 w-4 rounded border border-input accent-primary disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span>
            {sentenceFromIdentifier(field.name)}
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
          {...register(name)}
        />
        <FieldDescription field={field} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label}
      <Textarea
        id={id}
        placeholder={fieldPlaceholder(field)}
        className="min-h-[80px] resize-none"
        disabled={disabled}
        autoFocus={autoFocus}
        {...register(name)}
      />
      <FieldDescription field={field} />
    </div>
  );
}

export function ListInputField({
  field,
  disabled,
  autoFocus,
  register,
  control,
  label,
}: {
  field: CommandCenterInputField;
  disabled: boolean;
  autoFocus?: boolean;
  register: UseFormRegister<CommandFormValues>;
  control: Control<CommandFormValues>;
  label: ReactNode;
}) {
  const itemSchema = arrayItemSchema(field.schema);
  const itemType = schemaType(itemSchema);
  const enumValues = itemSchema?.enum;
  const itemProperties = objectSchemaFields(itemSchema);
  const {
    fields: rows,
    append,
    remove,
  } = useFieldArray({
    control: control as unknown as Control<FieldValues>,
    name: field.name,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        {label}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => append(listItemDefaultValue(field))}
        >
          <Plus className="h-3.5 w-3.5" />
          Add item
        </Button>
      </div>
      <div className="space-y-2">
        {rows.length ? (
          rows.map((row, index) => {
            const itemName = `${field.name}.${index}.value`;
            const itemId = `command-${field.name}-${row.id}`;
            const itemLabel = `${sentenceFromIdentifier(field.name)} ${index + 1}`;

            return (
              <div
                key={row.id}
                className="flex items-start gap-2 rounded-md border border-border p-2"
              >
                <div className="min-w-0 flex-1">
                  {itemType === "object" ? (
                    <div className="space-y-3">
                      <div className="text-xs font-semibold text-muted-foreground">
                        {itemLabel}
                      </div>
                      {itemProperties.map((property, propertyIndex) => (
                        <ObjectPropertyInput
                          key={property.name}
                          field={property}
                          name={`${field.name}.${index}.${property.name}`}
                          id={`${itemId}-${property.name}`}
                          disabled={disabled}
                          autoFocus={
                            autoFocus && index === 0 && propertyIndex === 0
                          }
                          register={register}
                        />
                      ))}
                    </div>
                  ) : Array.isArray(enumValues) ? (
                    <select
                      id={itemId}
                      aria-label={itemLabel}
                      disabled={disabled}
                      autoFocus={autoFocus && index === 0}
                      {...register(itemName)}
                      className="flex h-[38px] w-full rounded-md border border-input bg-transparent px-2 py-1 text-base transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {!field.required ? <option value="">Select...</option> : null}
                      {enumValues.map((value) => (
                        <option key={enumValue(value)} value={enumValue(value)}>
                          {enumValue(value)}
                        </option>
                      ))}
                    </select>
                  ) : itemType === "boolean" ? (
                    <label
                      htmlFor={itemId}
                      className="flex h-[38px] items-center gap-2 text-sm font-medium"
                    >
                      <input
                        id={itemId}
                        type="checkbox"
                        disabled={disabled}
                        autoFocus={autoFocus && index === 0}
                        {...register(itemName)}
                        className="h-4 w-4 rounded border border-input accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <span>{itemLabel}</span>
                    </label>
                  ) : itemType === "string" ||
                    itemType === "number" ||
                    itemType === "integer" ? (
                    <Input
                      id={itemId}
                      aria-label={itemLabel}
                      type={itemType === "string" ? "text" : "number"}
                      step={itemType === "integer" ? "1" : "any"}
                      placeholder={itemType === "string" ? "Item" : "0"}
                      disabled={disabled}
                      autoFocus={autoFocus && index === 0}
                      {...register(itemName)}
                    />
                  ) : (
                    <Textarea
                      id={itemId}
                      aria-label={itemLabel}
                      placeholder="JSON"
                      className="min-h-[80px] resize-none"
                      disabled={disabled}
                      autoFocus={autoFocus && index === 0}
                      {...register(itemName)}
                    />
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${itemLabel}`}
                  disabled={disabled}
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })
        ) : (
          <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
            No items
          </div>
        )}
      </div>
      <FieldDescription field={field} />
    </div>
  );
}
