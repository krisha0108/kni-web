"use client";

import Link from "next/link";
import { useState } from "react";

const NAV = [
  { label: "Home", href: "/" },
  { label: "About", href: "/#about" },
  { label: "Services", href: "/#services" },
  { label: "Process", href: "/#process" },
  { label: "Testimonial", href: "/#testimonial" },
  { label: "Blog", href: "/blog" },
  { label: "Owner Guide", href: "/guide/owner" },
  { label: "Launch Pad", href: "/launchpad" },
  { label: "Careers", href: "/careers" },
  { label: "Contact", href: "/#contact" },
];

/** Shared header for inner pages — mirrors the home page navbar's exact
 *  layout (logo wrapper, container, link spacing) but with a solid bg
 *  since these pages have no video hero behind it. */
export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 mx-auto max-w-[1920px] w-full px-5 py-2 text-white lg:px-16 lg:py-3 bg-[#1D2254] shadow-md z-50">
        <div className="container flex flex-wrap items-center justify-between mx-auto text-gray-100">
          <div className="h-12 w-40 lg:w-48 lg:h-14 xl:w-60 xl:mb-3">
            <Link
              href="/"
              className="mr-4 block cursor-pointer py-1.5 text-base text-gray-200 font-semibold"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/landing/assests/kniwhite-logo.png" alt="kni-logo" />
            </Link>
          </div>

          {/* Desktop menu */}
          <div className="hidden lg:block">
            <ul className="flex flex-col gap-2 mt-2 mb-4 lg:mb-0 lg:mt-0 lg:flex-row lg:items-center lg:gap-6">
              {NAV.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center p-1 text-lg gap-x-2 text-gray-200 hover:text-[#E71720]"
                >
                  <Link href={item.href} className="flex items-center">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li className="flex items-center ml-4">
                <Link
                  href="/login"
                  className="bg-[#E71720] hover:bg-[#c9141c] text-white px-6 py-2 rounded-full text-lg font-medium transition-all duration-300"
                >
                  Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="relative ml-auto h-6 max-h-[40px] w-6 max-w-[40px] select-none rounded-lg text-center align-middle text-xs font-medium uppercase text-inherit transition-all lg:hidden"
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
        className={`fixed top-0 left-0 z-[60] h-screen w-64 overflow-y-auto bg-[#5A5758] p-4 text-white transition-transform ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-4 mt-2 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/landing/assests/kniwhite-logo.png" alt="kni-logo" className="h-9 w-auto" />
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="p-1">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <ul className="space-y-1 font-medium">
          {NAV.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg p-2 hover:bg-gray-100 hover:text-black"
              >
                {item.label}
              </Link>
            </li>
          ))}
          <li className="mt-3">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="block rounded-lg bg-[#E71720] p-3 text-center font-medium text-white hover:bg-[#c9141c]"
            >
              Login
            </Link>
          </li>
        </ul>
      </div>
      {open && <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}
    </>
  );
}
