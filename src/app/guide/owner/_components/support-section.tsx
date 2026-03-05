import Link from "next/link";
import { getSession } from "@/server/auth/session";

export async function SupportSection() {
  const session = await getSession();

  return (
    <section className="bg-gradient-to-br from-muted/50 via-muted/30 to-background">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Still Have Questions?
        </h2>
        <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
          Our support team is here to help you get started. Reach out anytime
          and we&apos;ll guide you through the process.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Average response time: under 2 hours
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/register-owner"
            className="inline-flex items-center rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:bg-primary/90"
          >
            Register Now
          </Link>
          <Link
            href={session ? "/owner/support" : "/login"}
            className="inline-flex items-center rounded-full border border-primary px-8 py-3 text-sm font-semibold text-primary transition hover:bg-primary/5"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </section>
  );
}