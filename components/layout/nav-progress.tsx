"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Bar = { width: number; visible: boolean; fast: boolean };
const HIDDEN: Bar = { width: 0, visible: false, fast: true };

/**
 * Thin top bar: starts the moment an internal link is clicked, creeps forward while the next page loads,
 * and completes when the new route has rendered. Links with data-nav-progress="off" and new-tab links are ignored.
 */
export function NavProgress() {
  const pathname = usePathname();
  const [bar, setBar] = useState<Bar>(HIDDEN);
  const active = useRef(false);
  const timers = useRef<number[]>([]);

  const clear = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  const finish = useCallback(() => {
    if (!active.current) return;
    active.current = false;
    clear();
    setBar({ width: 100, visible: true, fast: true });
    timers.current.push(window.setTimeout(() => setBar(HIDDEN), 250));
  }, [clear]);

  const start = useCallback(() => {
    clear();
    active.current = true;
    setBar({ width: 0, visible: true, fast: true });
    timers.current.push(window.setTimeout(() => setBar({ width: 85, visible: true, fast: false }), 30));
    timers.current.push(window.setTimeout(finish, 15000)); // safety net if a navigation never completes
  }, [clear, finish]);

  // The route changed, so the new page is on screen.
  useEffect(() => {
    finish();
  }, [pathname, finish]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      if (anchor.dataset.navProgress === "off") return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      start();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [start]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]">
      <div
        className="h-full bg-ink"
        style={{
          width: `${bar.width}%`,
          opacity: bar.visible ? 1 : 0,
          transition: bar.fast
            ? "width 200ms ease-out, opacity 200ms ease-out"
            : "width 8s cubic-bezier(0.1, 0.8, 0.2, 1)",
        }}
      />
    </div>
  );
}
