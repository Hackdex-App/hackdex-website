"use client";

import React, { Fragment } from "react";
import { Listbox, ListboxButton, ListboxOptions, ListboxOption, Transition } from "@headlessui/react";
import { FiChevronDown, FiCheck } from "react-icons/fi";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  disabled = false,
  className = "",
  id,
  name,
}: SelectProps) {
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      {({ open }) => (
        <div className="relative">
          <ListboxButton
            id={id}
            className={`relative h-11 w-full rounded-md bg-[var(--surface-2)] px-3 pr-10 text-left text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-50 ${className}`}
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
            <ListboxOptions className="absolute z-10 mt-1 max-h-60 min-w-full max-w-[400px] w-max overflow-auto rounded-md bg-background/95 backdrop-blur-sm py-1 text-sm shadow-lg ring-1 ring-[var(--border)] focus:outline-none">
              {options.map((option) => (
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
                      <span className={`block truncate ${selected ? "font-medium" : "font-normal"}`}>
                        {option.label}
                      </span>
                      {selected && (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-foreground">
                          <FiCheck className="h-4 w-4" aria-hidden="true" />
                        </span>
                      )}
                    </>
                  )}
                </ListboxOption>
              ))}
            </ListboxOptions>
          </Transition>
        </div>
      )}
    </Listbox>
  );
}
