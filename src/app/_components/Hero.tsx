"use client";

import { useEffect, useRef, useState } from "react";

const WORDS = [
  "Seamless Service Bookings",
  "Effortless Equipment Selection",
  "Expert AMC Solutions",
  "Tailored Kitchen Consultations",
  "Real-Time Engineer Tracking",
  "Innovative Operational Tools",
  "Reliable Manpower Sourcing",
  "Simplified Maintenance Services",
  "Efficient Resource Management",
  "Exceptional Customer Experiences",
];

export default function Hero() {
  const [text, setText] = useState("");
  const [filled, setFilled] = useState(false);
  const state = useRef({ wordIndex: 0, charIndex: 0, isDeleting: false, isWaiting: false });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setFilled(true);
    const type = () => {
      const s = state.current;
      const currentWord = WORDS[s.wordIndex];

      if (!s.isDeleting && s.charIndex <= currentWord.length) {
        setText(currentWord.substring(0, s.charIndex));
        s.charIndex++;
      }
      if (s.isDeleting && s.charIndex >= 0) {
        setText(currentWord.substring(0, s.charIndex));
        s.charIndex--;
      }
      if (!s.isDeleting && s.charIndex === currentWord.length + 1) {
        s.isWaiting = true;
        timer.current = setTimeout(() => {
          s.isDeleting = true;
          s.isWaiting = false;
          type();
        }, 1200);
        return;
      }
      if (s.isDeleting && s.charIndex < 0) {
        s.wordIndex = (s.wordIndex + 1) % WORDS.length;
        s.isDeleting = false;
        s.charIndex = 0;
      }
      const typingSpeed = s.isDeleting ? 50 : 100;
      timer.current = setTimeout(type, typingSpeed);
    };
    type();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <section id="home">
      <div className="flex flex-col justify-center items-center relative">
        <div className="mt-20 lg:mt-28">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/landing/assests/kni.svg" alt="KNI logo" />
        </div>
        <div className="wrapper">
          <h1 className="static-txt text-2xl px-2 md:text-3xl lg:text-5xl xl:text-6xl">
            Revolutionizing Commercial Kitchens with
            <br />
            <span className={`dynamic-text drop-shadow-lg text-2xl md:text-3xl lg:text-5xl xl:text-6xl ${filled ? "filled" : ""}`}>
              {text}
            </span>
          </h1>
        </div>
      </div>
    </section>
  );
}
