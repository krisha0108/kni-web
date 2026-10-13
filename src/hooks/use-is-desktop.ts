"use client";

import { useEffect, useState } from "react";

const DESKTOP_QUERY = "(min-width: 1024px)";

/** Mirrors the project's `lg` Tailwind breakpoint (1024px). Returns
 * `undefined` until the first client-side check runs, so callers can defer
 * rendering until the real viewport is known (avoids a hydration mismatch
 * since the server has no concept of screen width). */
export function useIsDesktop(): boolean | undefined {
  const [isDesktop, setIsDesktop] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const handleChange = ({ matches }: { matches: boolean }) => setIsDesktop(matches);
    handleChange(mql);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return isDesktop;
}
