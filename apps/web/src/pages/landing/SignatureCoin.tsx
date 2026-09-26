import { useEffect, useRef, useState } from "react";
import { useReducedMotion, type MotionValue } from "framer-motion";
import type { CoinController } from "./coin3d.js";

/** La 3D n'est chargée que si elle a une chance de tourner sans peine. */
function canRun3d() {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (nav.connection?.saveData) return false;
  if (nav.deviceMemory !== undefined && nav.deviceMemory < 2) return false;
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

/**
 * La pièce Okodukai, objet signature du hero. Elle s'affiche d'abord en image (rendu du studio),
 * puis la version 3D prend le relais une fois le hero chargé : elle tourne doucement, suit le
 * pointeur et pivote quand on quitte le monde. Sous `prefers-reduced-motion`, l'image reste.
 */
export function SignatureCoin({ progress, className = "" }: { progress: MotionValue<number>; className?: string }) {
  const reduce = useReducedMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = canvas.current;
    if (reduce || !el || !canRun3d()) return;
    let controller: CoinController | null = null;
    let cancelled = false;
    let inView = true;

    const sync = () => controller?.setActive(inView && document.visibilityState === "visible");
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    observer.observe(el);
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === "mouse") controller?.pointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    };
    const onResize = () => controller?.resize();

    const start = () => {
      import("./coin3d.js")
        .then(({ mountCoin }) => mountCoin(el, { getScroll: () => progress.get() }))
        .then((c) => {
          if (cancelled) return c.dispose();
          controller = c;
          setLive(true);
          sync();
        })
        .catch(() => {
          /* l'image de la pièce reste affichée */
        });
    };
    // Après le premier rendu du hero : la 3D ne concurrence jamais l'image de fond.
    const idle = window.requestIdleCallback ? window.requestIdleCallback(start, { timeout: 1800 }) : window.setTimeout(start, 700);

    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", sync);
    return () => {
      cancelled = true;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", sync);
      controller?.dispose();
    };
  }, [reduce, progress]);

  return (
    <div className={`lp-coin ${live ? "lp-coin--live" : ""} ${className}`} aria-hidden="true">
      <img src="/assets/coins/okodukai-coin-512.webp" srcSet="/assets/coins/okodukai-coin-192.webp 192w, /assets/coins/okodukai-coin-512.webp 512w" sizes="(max-width: 767px) 120px, 280px" alt="" width={280} height={280} className="lp-coin-still" />
      <canvas ref={canvas} className="lp-coin-canvas" />
    </div>
  );
}
