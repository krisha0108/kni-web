"use client";

import { useEffect, useState, useCallback } from "react";

type NavItem = { label: string; target?: string; href?: string };

const NAV_ITEMS: NavItem[] = [
  { label: "Home", target: "home" },
  { label: "About", target: "about" },
  { label: "Services", target: "services" },
  { label: "Process", target: "process" },
  { label: "Testimonial", target: "testimonial" },
  { label: "Blog", href: "/blog" },
  { label: "Owner Guide", href: "/guide/owner" },
  { label: "Launch Pad", href: "/launchpad" },
  { label: "Careers", href: "/careers" },
  { label: "Contact", target: "contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [active, setActive] = useState("home");

  // Navbar background change + active section detection on scroll
  useEffect(() => {
    const sectionIds = NAV_ITEMS.filter((i) => i.target).map((i) => i.target!) ;

    const onScroll = () => {
      setScrolled(window.scrollY > 100);

      // active section: first section whose top is within a 100px buffer
      const buffer = 100;
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= buffer && rect.bottom >= buffer) {
          setActive(id);
          break;
        }
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Deep-link support: if someone arrives at /#services (shared/bookmarked link),
  // scroll to that section on load. Normal nav clicks keep the URL clean (no hash).
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const el = document.getElementById(hash);
    if (!el) return;
    const t = setTimeout(() => {
      el.scrollIntoView({ behavior: "auto", block: "start" });
      setActive(hash);
    }, 100);
    return () => clearTimeout(t);
  }, []);

  const smoothScroll = useCallback((target: string) => {
    const el = document.getElementById(target);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setDrawerOpen(false);
  }, []);

  const handleNavClick = (e: React.MouseEvent, item: NavItem) => {
    if (item.target) {
      e.preventDefault();
      smoothScroll(item.target);
    }
  };

  return (
    <>
      <nav
        id="mainNav"
        className={`fixed mx-auto max-w-[1920px] w-full px-5 py-2 text-white lg:px-16 lg:py-3 border-b-2 border-b-white z-10 transition-all duration-300 ${
          scrolled ? "navbar-scrolled" : ""
        }`}
      >
        <div className="container flex flex-wrap items-center justify-between mx-auto text-gray-100">
          <div className="h-12 w-40 lg:w-48 lg:h-14 xl:w-60 xl:mb-3">
            <a
              href="#home"
              onClick={(e) => handleNavClick(e, { label: "Home", target: "home" })}
              className="mr-4 block cursor-pointer py-1.5 text-base text-gray-200 font-semibold"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/landing/assests/kniwhite-logo.png" alt="kni-logo" />
            </a>
          </div>

          {/* Desktop menu */}
          <div className="hidden lg:block">
            <ul className="flex flex-col gap-2 mt-2 mb-4 lg:mb-0 lg:mt-0 lg:flex-row lg:items-center lg:gap-6">
              {NAV_ITEMS.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center p-1 text-lg gap-x-2 text-gray-200 hover:text-[#E71720]"
                >
                  <a
                    href={item.target ? `#${item.target}` : item.href}
                    onClick={(e) => handleNavClick(e, item)}
                    className="nav-link flex items-center"
                    style={item.target && active === item.target ? { color: "red" } : undefined}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
              <li className="flex items-center ml-4">
                <a
                  href="/login"
                  className="bg-[#E71720] hover:bg-[#c9141c] text-white px-6 py-2 rounded-full text-lg font-medium transition-all duration-300"
                >
                  Login
                </a>
              </li>
            </ul>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            className="relative ml-auto h-6 max-h-[40px] w-6 max-w-[40px] select-none rounded-lg text-center align-middle text-xs font-medium uppercase text-inherit transition-all hover:bg-transparent focus:bg-transparent active:bg-transparent lg:hidden"
          >
            <span className="absolute transform -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div
        id="drawer-navigation"
        className={`fixed top-0 left-0 z-40 w-64 h-screen p-4 overflow-y-auto transition-transform bg-[#5A5758] ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Sidebar"
      >
        <div className="mr-4 mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/landing/assests/kniwhite-logo.png" alt="kni-logo" />
        </div>
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setDrawerOpen(false)}
          className="text-gray-300 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 absolute top-2.5 end-2.5 inline-flex items-center"
        >
          <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          <span className="sr-only">Close menu</span>
        </button>
        <div className="py-4 overflow-y-auto text-white">
          <ul className="space-y-2 font-medium text-white">
            {NAV_ITEMS.map((item) => (
              <li key={item.label}>
                <a
                  href={item.target ? `#${item.target}` : item.href}
                  onClick={(e) => handleNavClick(e, item)}
                  className="nav-link flex items-center p-2 rounded-lg hover:bg-gray-100 group hover:text-black"
                >
                  <span className="flex-1 ms-3 whitespace-nowrap">{item.label}</span>
                </a>
              </li>
            ))}
            <li className="mt-4">
              <a
                href="/login"
                className="flex items-center justify-center p-3 bg-[#E71720] hover:bg-[#c9141c] text-white rounded-lg font-medium transition-all duration-300"
              >
                Login
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Drawer backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
