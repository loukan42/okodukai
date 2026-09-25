import type { PointerEvent } from "react";

/** A small, pointer-only parallax response; the card artwork stays untouched. */
export function tiltCard(event: PointerEvent<HTMLElement>) {
  if ((event.pointerType !== "mouse" && event.pointerType !== "pen") || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const rect = event.currentTarget.getBoundingClientRect();
  const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
  event.currentTarget.style.setProperty("--tilt-x", `${((.5 - y) * 12).toFixed(2)}deg`);
  event.currentTarget.style.setProperty("--tilt-y", `${((x - .5) * 12).toFixed(2)}deg`);
  event.currentTarget.style.setProperty("--glint-x", `${(x * 100).toFixed(1)}%`);
  event.currentTarget.style.setProperty("--glint-y", `${(y * 100).toFixed(1)}%`);
}

export function resetCardTilt(event: PointerEvent<HTMLElement>) {
  event.currentTarget.style.setProperty("--tilt-x", "0deg");
  event.currentTarget.style.setProperty("--tilt-y", "0deg");
  event.currentTarget.style.setProperty("--glint-x", "50%");
  event.currentTarget.style.setProperty("--glint-y", "50%");
}
