"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronRight, ChevronLeft, Sparkles, Rocket } from "lucide-react";

const STORAGE_KEY = "onboarding_completed";

interface TourStep {
  id: string;
  title: string;
  description: string;
  /** data-tour attribute value to target, or null for centered overlay */
  target: string | null;
  /** Preferred tooltip position relative to target */
  position: "top" | "bottom" | "left" | "right" | "center";
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to KNI Super App!",
    description:
      "Let us show you around. This quick tour will help you get familiar with the key features of your restaurant management dashboard.",
    target: null,
    position: "center",
  },
  {
    id: "dashboard",
    title: "Your Dashboard",
    description:
      "This is your dashboard. View key metrics like bookings, expenses, equipment count, and net revenue — all at a glance.",
    target: "dashboard-content",
    position: "bottom",
  },
  {
    id: "restaurant-selector",
    title: "Restaurant Selector",
    description:
      "Switch between your restaurants here. All dashboard data updates based on the selected restaurant.",
    target: "restaurant-selector",
    position: "bottom",
  },
  {
    id: "sidebar",
    title: "Sidebar Navigation",
    description:
      "Use the sidebar to access all features — bookings, equipment, marketplace, expenses, staff management, and more.",
    target: "sidebar",
    position: "right",
  },
  {
    id: "notifications",
    title: "Notifications",
    description:
      "Check notifications here. You'll get alerts for bookings, payments, order updates, and more.",
    target: "notifications",
    position: "bottom",
  },
  {
    id: "search",
    title: "Quick Search",
    description:
      "Use Ctrl+K to quickly search across equipment, bookings, staff, orders, and expenses.",
    target: "search",
    position: "bottom",
  },
  {
    id: "done",
    title: "You're All Set!",
    description:
      "Explore the app or start by adding your equipment. You can always find help in the Support section from the sidebar.",
    target: null,
    position: "center",
  },
];

interface TooltipPosition {
  top: number;
  left: number;
  arrowDirection: "top" | "bottom" | "left" | "right" | "none";
}

function getTooltipPosition(
  targetRect: DOMRect | null,
  position: TourStep["position"],
  tooltipWidth: number,
  tooltipHeight: number
): TooltipPosition {
  if (!targetRect || position === "center") {
    return {
      top: window.innerHeight / 2 - tooltipHeight / 2,
      left: window.innerWidth / 2 - tooltipWidth / 2,
      arrowDirection: "none",
    };
  }

  const gap = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top = 0;
  let left = 0;
  let arrowDirection: TooltipPosition["arrowDirection"] = "top";

  switch (position) {
    case "bottom":
      top = targetRect.bottom + gap;
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
      arrowDirection = "top";
      break;
    case "top":
      top = targetRect.top - tooltipHeight - gap;
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
      arrowDirection = "bottom";
      break;
    case "right":
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
      left = targetRect.right + gap;
      arrowDirection = "left";
      break;
    case "left":
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
      left = targetRect.left - tooltipWidth - gap;
      arrowDirection = "right";
      break;
  }

  // Clamp to viewport
  if (left < 12) left = 12;
  if (left + tooltipWidth > vw - 12) left = vw - tooltipWidth - 12;
  if (top < 12) top = 12;
  if (top + tooltipHeight > vh - 12) top = vh - tooltipHeight - 12;

  return { top, left, arrowDirection };
}

export function OnboardingTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition>({
    top: 0,
    left: 0,
    arrowDirection: "none",
  });
  const [mounted, setMounted] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Check if tour should show
  useEffect(() => {
    setMounted(true);
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Small delay so the page finishes rendering
      const timer = setTimeout(() => setIsActive(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const step = TOUR_STEPS[currentStep];

  // Find and measure the target element
  const measureTarget = useCallback(() => {
    if (!step) return;

    if (!step.target) {
      setTargetRect(null);
      return;
    }

    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [step]);

  useEffect(() => {
    if (!isActive) return;
    measureTarget();

    // Recalculate on scroll/resize
    const handleUpdate = () => measureTarget();
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);
    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
    };
  }, [isActive, currentStep, measureTarget]);

  // Position tooltip after target measurement
  useEffect(() => {
    if (!isActive || !step) return;

    // Use requestAnimationFrame to wait for tooltip to render so we can measure it
    requestAnimationFrame(() => {
      const tooltipEl = tooltipRef.current;
      const w = tooltipEl?.offsetWidth || 360;
      const h = tooltipEl?.offsetHeight || 200;
      const pos = getTooltipPosition(targetRect, step.position, w, h);
      setTooltipPos(pos);
    });
  }, [isActive, step, targetRect]);

  const completeTour = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsActive(false);
  }, []);

  // ESC key handler
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        completeTour();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isActive, completeTour]);

  const goNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      completeTour();
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  if (!mounted || !isActive || !step) return null;

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const isCentered = step.position === "center";

  // Spotlight padding around target
  const spotlightPadding = 8;

  const overlay = (
    <div className="fixed inset-0 z-[9999]" aria-modal="true" role="dialog">
      {/* Backdrop SVG with cutout */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: "none" }}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && !isCentered && (
              <rect
                x={targetRect.left - spotlightPadding}
                y={targetRect.top - spotlightPadding}
                width={targetRect.width + spotlightPadding * 2}
                height={targetRect.height + spotlightPadding * 2}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.6)"
          mask="url(#tour-spotlight-mask)"
          style={{ pointerEvents: "auto" }}
          onClick={(e) => e.stopPropagation()}
        />
      </svg>

      {/* Spotlight border highlight */}
      {targetRect && !isCentered && (
        <div
          className="absolute rounded-lg ring-2 ring-[#EF3A3A] ring-offset-2 transition-all duration-300 ease-in-out"
          style={{
            top: targetRect.top - spotlightPadding,
            left: targetRect.left - spotlightPadding,
            width: targetRect.width + spotlightPadding * 2,
            height: targetRect.height + spotlightPadding * 2,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute w-[calc(100vw-2rem)] sm:w-[360px] max-w-[360px] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          zIndex: 10000,
        }}
      >
        {/* Arrow */}
        {tooltipPos.arrowDirection !== "none" && (
          <div
            className="absolute w-3 h-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rotate-45"
            style={{
              ...(tooltipPos.arrowDirection === "top" && {
                top: -7,
                left: "50%",
                marginLeft: -6,
                borderBottom: "none",
                borderRight: "none",
              }),
              ...(tooltipPos.arrowDirection === "bottom" && {
                bottom: -7,
                left: "50%",
                marginLeft: -6,
                borderTop: "none",
                borderLeft: "none",
              }),
              ...(tooltipPos.arrowDirection === "left" && {
                left: -7,
                top: "50%",
                marginTop: -6,
                borderTop: "none",
                borderRight: "none",
              }),
              ...(tooltipPos.arrowDirection === "right" && {
                right: -7,
                top: "50%",
                marginTop: -6,
                borderBottom: "none",
                borderLeft: "none",
              }),
            }}
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            {isCentered && isFirstStep && (
              <Sparkles className="h-5 w-5 text-[#EF3A3A]" />
            )}
            {isCentered && isLastStep && (
              <Rocket className="h-5 w-5 text-[#EF3A3A]" />
            )}
            <h3 className="font-semibold text-base text-[#1D2254] dark:text-white">
              {step.title}
            </h3>
          </div>
          <button
            onClick={completeTour}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-3">
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 pb-4 pt-2 border-t border-gray-100 dark:border-gray-800 mt-1">
          <span className="text-xs text-gray-400 font-medium">
            {currentStep + 1} of {TOUR_STEPS.length}
          </span>

          <div className="flex items-center gap-2">
            {!isLastStep && (
              <button
                onClick={completeTour}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Skip Tour
              </button>
            )}

            {!isFirstStep && (
              <button
                onClick={goPrev}
                className="flex items-center gap-1 text-sm text-[#1D2254] dark:text-gray-300 px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}

            <button
              onClick={goNext}
              className="flex items-center gap-1 text-sm font-medium text-white px-4 py-1.5 rounded-md transition-colors"
              style={{ backgroundColor: "#EF3A3A" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#d63232")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#EF3A3A")
              }
            >
              {isLastStep ? (
                "Get Started"
              ) : (
                <>
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pb-3">
          {TOUR_STEPS.map((_, idx) => (
            <div
              key={idx}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: idx === currentStep ? 20 : 6,
                backgroundColor:
                  idx === currentStep ? "#EF3A3A" : "#d1d5db",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
