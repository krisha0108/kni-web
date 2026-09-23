"use client";

import { useEffect, useRef, useState } from "react";

const ACHIEVEMENTS = [
  {
    kind: "svg" as const,
    node: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#E71720"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-check-check w-8 h-8"
      >
        <path d="M18 6 7 17l-5-5" />
        <path d="m22 10-7.5 7.5L13 16" />
      </svg>
    ),
    title: "End-to-End",
    label: "Project Execution",
  },
  {
    kind: "img" as const,
    icon: "HappyCustomers.svg",
    title: "Trusted Partner",
    label: "Across Gujarat",
  },
  {
    kind: "img" as const,
    icon: "GreatReviews.svg",
    title: "Client-First",
    label: "Built on Referrals",
  },
  {
    kind: "img" as const,
    icon: "SupportTeam.svg",
    title: "Always On",
    label: "Dedicated Support",
  },
];

export default function Achievements() {
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="max-w-5xl mx-auto text-center px-5 mb-10">
      <h2 className="text-3xl uppercase md:text-4xl lg:text-5xl text-center font-bold text-gray-900 py-8">
        Achievements
      </h2>
      <div className="flex flex-wrap justify-center md:justify-between gap-6 mt-4">
        {ACHIEVEMENTS.map((a, i) => (
          <div
            key={a.title}
            className={`w-36 sm:w-44 flex flex-col items-center ${visible ? "animate-step-in" : "opacity-0"}`}
            style={{ animationDelay: `${i * 140}ms` }}
          >
            <div className="flex items-center justify-center w-24 h-24 bg-gray-100 rounded-full transition-transform duration-300 hover:scale-105">
              <div className="flex items-center justify-center w-16 h-16 border-2 border-red-500 rounded-full">
                {a.kind === "svg" ? (
                  a.node
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img loading="lazy" src={`/landing/assests/${a.icon}`} alt={a.title} className="w-8 h-8" />
                )}
              </div>
            </div>
            <p className="mt-2 text-3xl sm:text-4xl font-black">{a.title}</p>
            <p className="text-xl text-gray-900">{a.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
