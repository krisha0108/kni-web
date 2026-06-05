"use client";

import { useState } from "react";

export default function Contact() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const data = {
      name: String(fd.get("name") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      phone: String(fd.get("phone") || "").trim(),
      subject: String(fd.get("subject") || "").trim(),
      message: String(fd.get("message") || "").trim(),
    };
    if (!data.name || !data.email || !data.phone) {
      setStatus("error");
      setErrorMsg("Please fill in your name, email and phone.");
      return;
    }
    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.ok) {
        setStatus("success");
        form.reset();
      } else {
        setStatus("error");
        setErrorMsg(result.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please check your connection and try again.");
    }
  }

  return (
    <div id="contact" className="container-large px-4 py-8 sm:pb-12 sm:pt-20">
      <div className="text-center mb-8">
        <h2 className="text-3xl uppercase md:text-4xl lg:text-5xl text-center font-bold text-gray-900 mb-3">
          Get In Touch
        </h2>
        <p className="text-gray-900 text-base md:text-xl">
          Reach out to us for inquiries, support, or collaboration—we&apos;re here to help!
        </p>
      </div>

      <div className="relative max-w-4xl mx-auto">
        <div className="bg-white rounded-lg custom-shadow p-4 sm:p-8 form-section">
          <form className="space-y-6 max-w-xl" onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label htmlFor="name" className="block mb-2 text-base font-medium text-gray-900">Name</label>
                <input id="name" type="text" name="name" autoComplete="name" required placeholder="Name"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 text-sm" />
              </div>
              <div>
                <label htmlFor="email" className="block mb-2 text-base font-medium text-gray-900">Email</label>
                <input id="email" type="email" name="email" autoComplete="email" required placeholder="Email"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label htmlFor="subject" className="block mb-2 text-base font-medium text-gray-900">Subject</label>
                <input id="subject" type="text" name="subject" autoComplete="off" placeholder="Subject"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 text-sm" />
              </div>
              <div>
                <label htmlFor="phone" className="block mb-2 text-base font-medium text-gray-900">Phone</label>
                <input id="phone" type="tel" name="phone" autoComplete="tel" required placeholder="Phone"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 text-sm" />
              </div>
            </div>
            <div>
              <label htmlFor="message" className="block mb-2 text-base font-medium text-gray-900">Message</label>
              <textarea id="message" name="message" placeholder="Message" rows={6} style={{ resize: "none" }}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 text-sm" />
            </div>

            {status === "success" && (
              <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
                ✓ Thank you! Your message has been sent. We&apos;ll get back to you soon.
              </div>
            )}
            {status === "error" && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={status === "submitting"}
                className="bg-[#E71720] text-white px-6 py-2.5 rounded-lg hover:bg-red-600 transition-colors duration-300 inline-flex items-center gap-2 text-base disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === "submitting" ? "Sending..." : "Send"}
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
                  <path d="m21.854 2.147-10.94 10.939" />
                </svg>
              </button>
            </div>
          </form>
        </div>

        <div className="contact-info-position">
          <div className="bg-gray-50 rounded-lg p-6 shadow-lg">
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Contact Information</h2>

              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" src="/landing/assests/location.svg" alt="Address" className="w-8" />
                </div>
                <p className="text-gray-900 text-sm leading-relaxed">
                  KNI Services Pvt Ltd - ANOLI COMPLEX, A/2, Sunrise Park Road, nr. SANJIVANI HOSPITAL, Sunrise Park, Vastrapur, Ahmedabad, Gujarat 380054
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" src="/landing/assests/phone.svg" alt="Phone" className="w-4 h-4" />
                </div>
                <a href="tel:+918001700002" className="text-gray-600 text-sm hover:text-[#E71720]">8001 700002</a>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-[#E71720]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <a href="mailto:info@kniservices.com" className="text-gray-900 text-sm hover:text-[#E71720]">info@kniservices.com</a>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-[#E71720]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <p className="text-gray-900 text-sm">www.kniservices.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
