"use client";

import React, { Fragment, useState } from "react";
import { Listbox, ListboxButton, ListboxOptions, ListboxOption, Transition, Combobox, ComboboxInput, ComboboxOptions, ComboboxOption } from "@headlessui/react";
import { FiChevronDown, FiCheck } from "react-icons/fi";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
}

export interface SelectDivider {
  type: "divider";
  label?: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (SelectOption | SelectDivider)[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  dropdownClassName?: string;
  dropdownAlign?: "left" | "right";
  id?: string;
  name?: string;
  enableFilter?: boolean;
}

function DividerContent({ divider, index }: { divider: SelectDivider; index: number }) {
  return (
    <div key={`divider-${index}`} className="relative py-2 pointer-events-none">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-[var(--border)]" />
      </div>
      {divider.label && (
        <div className="relative flex justify-center">
          <span className="bg-background/95 px-2 text-xs text-foreground/60">
            {divider.label}
          </span>
        </div>
      )}
    </div>
  );
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  disabled = false,
  className = "",
  dropdownClassName = "",
  dropdownAlign = "left",
  id,
  name,
  enableFilter = false,
}: SelectProps) {
  const [query, setQuery] = useState("");

  // Separate options and dividers
  const actualOptions = options.filter((opt): opt is SelectOption => "value" in opt);
  const selectedOption = actualOptions.find((opt) => opt.value === value);

  // Filter function for Combobox
  const filterOptions = (query: string) => {
    if (!query) return options;

    // When filtering, exclude dividers and return only filtered options
    return actualOptions.filter((opt) =>
      opt.label.toLowerCase().includes(query.toLowerCase())
    );
  };


  if (enableFilter) {
    // Use Combobox for filterable select
    return (
      <Combobox
        value={value}
        onChange={(newValue) => {
          onChange(newValue || "");
          setQuery("");
        }}
        disabled={disabled}
        immediate
      >
        {({ open }) => (
          <div className="relative">
            <ComboboxInput
              id={id}
              displayValue={() => selectedOption?.label ?? ""}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              className={`relative h-11 w-full rounded-md bg-[var(--surface-2)] px-3 pr-10 text-left text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50 ${
                !selectedOption ? "text-foreground/60" : ""
              } ${className}`}
            />
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <FiChevronDown className={`h-4 w-4 text-foreground/60 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
            </span>
            {name && <input type="hidden" name={name} value={value} />}
            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <ComboboxOptions className={`absolute z-50 mt-1 max-h-60 min-w-full max-w-[400px] w-max overflow-auto rounded-md bg-background/95 backdrop-blur-sm py-1 text-sm shadow-lg ring-1 ring-[var(--border)] focus:outline-none ${dropdownAlign === "right" ? "right-0" : ""} ${dropdownClassName}`}>
                {(() => {
                  const displayItems = filterOptions(query);

                  if (displayItems.length === 0) {
                    return (
                      <div className="py-2 px-4 text-foreground/60 text-center">No results found</div>
                    );
                  }

                  return displayItems.map((item, index) => {
                    if ("type" in item && item.type === "divider") {
                      return <DividerContent key={`divider-${index}`} divider={item} index={index} />;
                    }

                    const option = item as SelectOption;
                    const Icon = option.icon;
                    return (
                      <ComboboxOption
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                        className={({ focus }) =>
                          `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                            focus ? "bg-black/5 dark:bg-white/10" : ""
                          } ${option.disabled ? "opacity-50 cursor-not-allowed" : ""}`
                        }
                      >
                        {({ selected }) => (
                          <>
                            <span className={`flex items-center gap-2 min-w-0 ${selected ? "font-medium" : "font-normal"}`}>
                              {Icon && <Icon className="h-4 w-4 shrink-0" />}
                              <span className="shrink-0">{option.label}</span>
                              {option.description && (
                                <span className="ml-auto text-xs text-foreground/40 pl-2 truncate min-w-0">
                                  {option.description}
                                </span>
                              )}
                            </span>
                            {selected && (
                              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-foreground">
                                <FiCheck className="h-4 w-4" aria-hidden="true" />
                              </span>
                            )}
                          </>
                        )}
                      </ComboboxOption>
                    );
                  });
                })()}
              </ComboboxOptions>
            </Transition>
          </div>
        )}
      </Combobox>
    );
  }

  // Use Listbox for non-filterable select
  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      {({ open }) => (
        <div className="relative">
          <ListboxButton
            id={id}
            className={`relative h-11 w-full cursor-pointer rounded-md bg-[var(--surface-2)] px-3 pr-10 text-left text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
          >
            <span className={`block truncate ${selectedOption ? "" : "text-foreground/60"}`}>
              {selectedOption?.label || placeholder}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <FiChevronDown className={`h-4 w-4 text-foreground/60 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
            </span>
          </ListboxButton>
          {name && <input type="hidden" name={name} value={value} />}
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <ListboxOptions className={`absolute z-50 mt-1 max-h-60 min-w-full max-w-[400px] w-max overflow-auto rounded-md bg-background/95 backdrop-blur-sm py-1 text-sm shadow-lg ring-1 ring-[var(--border)] focus:outline-none ${dropdownAlign === "right" ? "right-0" : ""} ${dropdownClassName}`}>
              {options.map((item, index) => {
                if ("type" in item && item.type === "divider") {
                  return <DividerContent key={`divider-${index}`} divider={item} index={index} />;
                }

                const option = item as SelectOption;
                const Icon = option.icon;
                return (
                  <ListboxOption
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className={({ focus }) =>
                      `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                        focus ? "bg-black/5 dark:bg-white/10" : ""
                      } ${option.disabled ? "opacity-50 cursor-not-allowed" : ""}`
                    }
                  >
                    {({ selected }) => (
                      <>
                        <span className={`flex items-center gap-2 min-w-0 ${selected ? "font-medium" : "font-normal"}`}>
                          {Icon && <Icon className="h-4 w-4 shrink-0" />}
                          <span className="shrink-0">{option.label}</span>
                          {option.description && (
                            <span className="ml-auto text-xs text-foreground/40 pl-2 truncate min-w-0">
                              {option.description}
                            </span>
                          )}
                        </span>
                        {selected && (
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-foreground">
                            <FiCheck className="h-4 w-4" aria-hidden="true" />
                          </span>
                        )}
                      </>
                    )}
                  </ListboxOption>
                );
              })}
            </ListboxOptions>
          </Transition>
        </div>
      )}
    </Listbox>
  );
}
