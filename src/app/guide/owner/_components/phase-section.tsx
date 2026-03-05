import { ReactNode } from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

interface PhaseSectionProps {
  phaseNumber: number;
  title: string;
  description: string;
  whatYouWillDo: string[];
  accentColor: string;
  ctaLabel: string;
  ctaHref: string;
  children: ReactNode;
}

export function PhaseSection({
  phaseNumber,
  title,
  description,
  whatYouWillDo,
  accentColor,
  ctaLabel,
  ctaHref,
  children,
}: PhaseSectionProps) {
  const isEven = phaseNumber % 2 === 0;
  const num = String(phaseNumber).padStart(2, "0");

  return (
    <section
      id={`phase-${phaseNumber}`}
      className={`scroll-mt-16 ${isEven ? "bg-muted/30" : ""}`}
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          {/* ── Left column: Text content ── */}
          <div className={isEven ? "lg:order-2" : ""}>
            {/* Phase badge + Title */}
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: accentColor }}
              >
                {num}
              </span>
              <div>
                <div
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: accentColor }}
                >
                  Phase {num}
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {title}
                </h2>
              </div>
            </div>

            {/* Description */}
            <p className="mt-4 text-muted-foreground leading-relaxed">
              {description}
            </p>

            {/* What you'll do */}
            <div className="mt-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                What you&apos;ll do
              </h3>
              <ul className="mt-3 space-y-0 divide-y">
                {whatYouWillDo.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 py-3"
                  >
                    <CheckCircle2
                      className="h-5 w-5 shrink-0"
                      style={{ color: accentColor }}
                    />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA button */}
            <div className="mt-6">
              <Link
                href={ctaHref}
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
                style={{ backgroundColor: accentColor }}
              >
                {ctaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* ── Right column: Carousel ── */}
          <div className={isEven ? "lg:order-1" : ""}>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}