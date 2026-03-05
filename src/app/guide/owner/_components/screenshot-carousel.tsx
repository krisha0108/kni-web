"use client";

import { ReactNode, useRef, useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Monitor } from "lucide-react";

interface Screen {
  title: string;
  children: ReactNode;
}

interface ScreenshotCarouselProps {
  screens: Screen[];
}

export function ScreenshotCarousel({ screens }: ScreenshotCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const scrollTo = useCallback(
    (index: number) => {
      const el = scrollRef.current;
      if (!el) return;
      const child = el.children[index] as HTMLElement | undefined;
      if (child) {
        el.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
      }
    },
    []
  );

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const width = el.offsetWidth;
    const idx = Math.round(scrollLeft / width);
    setActive(Math.min(idx, screens.length - 1));
  }, [screens.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const prev = () => scrollTo(Math.max(0, active - 1));
  const next = () => scrollTo(Math.min(screens.length - 1, active + 1));

  return (
    <div className="relative">
      {/* Screen count badge */}
      <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Monitor className="h-4 w-4" />
        <span>{screens.length} screens</span>
      </div>

      {/* Carousel track */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scrollbar-hide pb-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {screens.map((screen, i) => (
            <div
              key={i}
              className="w-full flex-shrink-0 snap-center"
            >
              {screen.children}
            </div>
          ))}
        </div>

        {/* Arrow buttons */}
        {screens.length > 1 && (
          <>
            <button
              onClick={prev}
              disabled={active === 0}
              className="absolute -left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border bg-background p-1.5 shadow-md transition hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Previous screen"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={next}
              disabled={active === screens.length - 1}
              className="absolute -right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border bg-background p-1.5 shadow-md transition hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next screen"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Dot indicators */}
      {screens.length > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {screens.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              className={`h-2 rounded-full transition-all ${
                i === active
                  ? "w-6 bg-primary"
                  : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
              aria-label={`Go to screen ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}