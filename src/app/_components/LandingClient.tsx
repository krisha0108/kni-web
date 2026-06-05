"use client";

import { useEffect } from "react";

// Ports the interactive bit of the old script.js: the FAQ accordion.
export default function LandingClient() {
  useEffect(() => {
    const headers = Array.from(document.querySelectorAll<HTMLElement>(".accordion-header"));
    const cleanups: Array<() => void> = [];
    headers.forEach((button) => {
      const handler = () => {
        const content = button.nextElementSibling as HTMLElement | null;
        if (!content) return;
        const isActive = content.classList.contains("active");
        document.querySelectorAll<HTMLElement>(".accordion-content").forEach((c) => {
          c.style.maxHeight = "";
          c.classList.remove("active");
        });
        if (!isActive) {
          content.classList.add("active");
          content.style.maxHeight = content.scrollHeight + "px";
        }
      };
      button.addEventListener("click", handler);
      cleanups.push(() => button.removeEventListener("click", handler));
    });

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return null;
}
