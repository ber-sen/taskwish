import { Controller, type Control } from "react-hook-form";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "../ui/combobox";
import type { CommandFormValues } from "../../lib/command-form";

export type FormComboboxOption = {
  label: string;
  value: string;
};

export function FormCombobox({
  id,
  name,
  options,
  control,
  placeholder = "Select...",
  emptyText = "No options found.",
  disabled,
  autoFocus,
  ariaLabel,
  clearable = true,
}: {
  id: string;
  name: string;
  options: FormComboboxOption[];
  control: Control<CommandFormValues>;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  ariaLabel?: string;
  clearable?: boolean;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const selected =
          options.find((option) => option.value === field.value) ?? null;

        return (
          <Combobox
            items={options}
            value={selected}
            itemToStringLabel={(option) => option.label}
            itemToStringValue={(option) => option.value}
            isItemEqualToValue={(option, value) =>
              option.value === value.value
            }
            onValueChange={(option) => field.onChange(option?.value ?? "")}
            autoHighlight
          >
            <ComboboxInput
              id={id}
              name={field.name}
              aria-label={ariaLabel}
              placeholder={placeholder}
              disabled={disabled}
              autoFocus={autoFocus}
              onBlur={field.onBlur}
              showClear={clearable && !disabled && Boolean(field.value)}
            />
            <ComboboxContent>
              <ComboboxEmpty>{emptyText}</ComboboxEmpty>
              <ComboboxList>
                {(option) => (
                  <ComboboxItem key={option.value} value={option}>
                    {option.label}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        );
      }}
    />
  );
}
