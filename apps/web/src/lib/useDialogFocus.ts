import { useEffect, useRef } from "react";

const SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';

/** Keeps keyboard focus inside an active custom dialog and restores its opener. */
export function useDialogFocus<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active || !ref.current) return;
    const root = ref.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => Array.from(root.querySelectorAll<HTMLElement>(SELECTOR)).filter((el) => el.getClientRects().length > 0);
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) { event.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const onFocusIn = (event: FocusEvent) => {
      if (event.target instanceof Node && !root.contains(event.target)) {
        focusable()[0]?.focus();
      }
    };
    root.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      root.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
      if (previous?.isConnected) previous.focus();
    };
  }, [active]);

  return ref;
}
