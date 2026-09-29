import React from "react";

/**
 * Modal plumbing shared by Sheet and Modal: focuses the panel, locks page
 * scroll, traps Tab inside the panel, closes on Escape, and hands focus back to
 * whatever had it before. Runs while `active`.
 */
export function useDialog(panelRef: React.RefObject<HTMLElement | null>, onClose: () => void, active = true) {
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  React.useEffect(() => {
    if (!active) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus({ preventScroll: true });
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // A menu inside the dialog handled it (and closed itself).
        if (e.defaultPrevented) return;
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const nodes = [...panelRef.current.querySelectorAll<HTMLElement>("button, input, [href], select, textarea, [tabindex]")].filter(
        (el) => !el.hasAttribute("disabled") && el.tabIndex >= 0 && !el.closest("[inert]") && el.getClientRects().length > 0,
      );
      if (nodes.length === 0) return;
      // Focus starts on the panel itself, so wrap from anywhere that isn't one of its controls.
      const at = nodes.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && at <= 0) {
        e.preventDefault();
        nodes[nodes.length - 1].focus();
      } else if (!e.shiftKey && (at === -1 || at === nodes.length - 1)) {
        e.preventDefault();
        nodes[0].focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      html.style.overflow = prevOverflow;
      opener?.focus({ preventScroll: true });
    };
  }, [active, panelRef]);
}
