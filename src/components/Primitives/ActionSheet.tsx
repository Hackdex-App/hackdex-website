"use client";

import React, { Fragment } from "react";
import { Dialog, Transition, TransitionChild, DialogPanel } from "@headlessui/react";

export interface ActionItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
}

interface ActionSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  actions: ActionItem[];
}

export default function ActionSheet({ open, onClose, title, actions }: ActionSheetProps) {
  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 flex items-end">
            <TransitionChild
              as={Fragment}
              enter="transform transition ease-out duration-200"
              enterFrom="translate-y-full"
              enterTo="translate-y-0"
              leave="transform transition ease-in duration-150"
              leaveFrom="translate-y-0"
              leaveTo="translate-y-full"
            >
              <DialogPanel className="w-full">
                <div className="mx-auto w-full max-w-screen-sm rounded-t-2xl bg-background ring-1 ring-[var(--border)]">
                  <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-foreground/20" />
                  {title && (
                    <div className="px-4 pb-2 pt-1 text-center text-sm font-medium text-foreground/90">{title}</div>
                  )}
                  <div className="px-2 pb-2">
                    <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                      <ul className="divide-y divide-[var(--border)]">
                        {actions.map((a) => (
                          <li key={a.key}>
                            {a.href ? (
                              <a
                                href={a.href}
                                onClick={onClose}
                                className="flex items-center gap-3 px-4 py-3 text-[15px] hover:bg-[var(--surface-2)]"
                              >
                                <span className="text-foreground/80">{a.icon}</span>
                                <span className="text-foreground">{a.label}</span>
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  try { a.onClick?.(); } finally { onClose(); }
                                }}
                                className="flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] hover:bg-[var(--surface-2)]"
                              >
                                <span className="text-foreground/80">{a.icon}</span>
                                <span className="text-foreground">{a.label}</span>
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="mt-2 mb-4 flex w-full items-center justify-center rounded-xl bg-[var(--surface-2)] px-4 py-3 text-[15px] ring-1 ring-[var(--border)] hover:bg-[var(--surface-3)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}



