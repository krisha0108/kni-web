import Link from "next/link";

const phases = [
  "Registration",
  "Login & Dashboard",
  "Add Restaurant",
  "Restaurant Approval",
  "Add Equipment",
  "Request AMC",
  "AMC Proposal & Payment",
  "Service Booking",
  "Marketplace",
  "Khatabook",
  "Staff Management",
  "Support",
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-red-600 to-red-800 text-white">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
          Grow Your Restaurant Business with KNI Super App
        </h1>
        <p className="mt-4 text-lg sm:text-xl text-white/80 max-w-2xl mx-auto">
          Follow our 12-phase journey to set up, manage, and scale your
          restaurant — from registration to full operations.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-2 sm:gap-3">
          {phases.map((phase, i) => (
            <a
              key={i}
              href={`#phase-${i + 1}`}
              className="flex items-center gap-1.5 rounded-full px-2 py-1 transition hover:bg-white/10"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="hidden sm:inline text-sm text-white/70">
                {phase}
              </span>
            </a>
          ))}
        </div>

        <div className="mt-10">
          <Link
            href="/register-owner"
            className="inline-flex items-center rounded-full bg-white px-8 py-3 text-sm font-semibold text-red-700 shadow-lg transition hover:bg-white/90 hover:shadow-xl"
          >
            Register Now
          </Link>
        </div>
      </div>
    </section>
  );
}
