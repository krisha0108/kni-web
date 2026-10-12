"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Afacad } from "next/font/google";
import SiteHeader from "../_components/SiteHeader";
import Footer from "../_components/Footer";
import JobApplicationDialog from "./_components/JobApplicationDialog";
import { Briefcase, MapPin, Clock } from "lucide-react";

const afacad = Afacad({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

interface JobPosition {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  department: string | null;
  location: string | null;
  employmentType: string | null;
  externalApplyUrl: string | null;
  legacyPositionValue: string | null;
}

export default function CareersPage() {
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [applyTo, setApplyTo] = useState<JobPosition | null>(null);

  useEffect(() => {
    fetch("/api/public/job-positions")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setPositions(data.data);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className={`min-h-screen bg-white text-gray-900 ${afacad.className}`}>
      <SiteHeader />

      <section className="bg-gradient-to-br from-[#1D2254] via-[#2d3470] to-[#E71720] px-5 py-14 text-center text-white lg:py-20">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold md:text-5xl">Careers at KNI</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-200">
            Join Kitchen Network International and help us build the commercial kitchen service marketplace.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-5 py-12 lg:px-8">
        {isLoading ? (
          <p className="text-center text-gray-500">Loading open positions...</p>
        ) : positions.length === 0 ? (
          <p className="text-center text-gray-500">No open positions right now. Please check back soon.</p>
        ) : (
          <div className="space-y-5">
            {positions.map((position) => (
              <div
                key={position.id}
                className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{position.title}</h2>
                  {position.description && (
                    <p className="mt-1 text-sm text-gray-600">{position.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    {position.department && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5" /> {position.department}
                      </span>
                    )}
                    {position.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {position.location}
                      </span>
                    )}
                    {position.employmentType && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {position.employmentType}
                      </span>
                    )}
                  </div>
                </div>
                {position.externalApplyUrl ? (
                  <Link
                    href={
                      position.legacyPositionValue
                        ? `${position.externalApplyUrl}?position=${position.legacyPositionValue}`
                        : position.externalApplyUrl
                    }
                    className="shrink-0 rounded-full bg-[#E71720] px-6 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-[#c01219]"
                  >
                    Apply Now
                  </Link>
                ) : (
                  <button
                    onClick={() => setApplyTo(position)}
                    className="shrink-0 rounded-full bg-[#E71720] px-6 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-[#c01219]"
                  >
                    Apply Now
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <JobApplicationDialog
        position={applyTo}
        open={!!applyTo}
        onOpenChange={(open) => !open && setApplyTo(null)}
      />

      <Footer />
    </div>
  );
}
