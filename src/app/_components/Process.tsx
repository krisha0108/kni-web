"use client";

import { useEffect, useRef, useState } from "react";

const STEPS = [
  { icon: "understanding.svg", alt: "understanding", label: "Understanding Your Needs" },
  { icon: "ExploringSolutions.svg", alt: "Exploring Solutions", label: "Exploring Solutions" },
  { icon: "SeamlessBooking.svg", alt: "Seamless Booking", label: "Seamless Booking" },
  { icon: "MatchingProfessionals.svg", alt: "Matching With Professionals", label: "Matching With Professionals" },
  { icon: "EfficientServiceDelivery.svg", alt: "Efficient Service Delivery", label: "Efficient Service Delivery" },
];

export default function Process() {
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
    <section id="process" ref={sectionRef} className="pt-8 sm:pt-20">
      <div className="container max-w-7xl mx-auto px-5 pb-8">
        <h2 className="text-3xl uppercase md:text-4xl lg:text-5xl text-center font-bold text-gray-900 mb-8">
          Our Process
        </h2>

        <div className="flex flex-row flex-nowrap items-start justify-start lg:justify-center gap-4 md:gap-3 max-w-7xl mx-auto overflow-x-auto pb-4">
          {STEPS.map((step, i) => (
            <div key={step.label} className="contents">
              <div
                className={`flex flex-col items-center shrink-0 w-48 ${visible ? "animate-step-in" : "opacity-0"}`}
                style={{ animationDelay: `${i * 140}ms` }}
              >
                <div className="group w-48 h-48 bg-white border border-[#e6e6e6] shadow-lg rounded-lg flex items-center justify-center transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-[#E71720]/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    loading="lazy"
                    src={`/landing/assests/${step.icon}`}
                    alt={step.alt}
                    className="w-16 h-16 transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
                <p className="text-base font-light text-center mt-3 leading-tight max-w-44">{step.label}</p>
              </div>

              {i < STEPS.length - 1 && (
                <div
                  className={`flex items-center justify-center w-8 h-48 shrink-0 ${visible ? "animate-step-in" : "opacity-0"}`}
                  style={{ animationDelay: `${i * 140 + 70}ms` }}
                >
                  <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
