"use client";

import { useEffect } from "react";
import { Afacad } from "next/font/google";
import "./styles.css";
import SiteHeader from "../_components/SiteHeader";

const afacad = Afacad({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export default function LaunchpadPage() {
  useEffect(() => {
    // FAQ accordion (was inline onclick="toggleFaq(this)")
    const faqBtns = Array.from(document.querySelectorAll<HTMLElement>(".faq-answer"))
      .map((a) => a.previousElementSibling as HTMLElement | null)
      .filter((b): b is HTMLElement => !!b);
    const faqCleanups: Array<() => void> = [];
    faqBtns.forEach((btn) => {
      const handler = () => {
        (btn.nextElementSibling as HTMLElement | null)?.classList.toggle("open");
        btn.querySelector(".faq-arrow")?.classList.toggle("open");
      };
      btn.addEventListener("click", handler);
      faqCleanups.push(() => btn.removeEventListener("click", handler));
    });

    // Counter animation when in view
    const animate = () => {
      document.querySelectorAll<HTMLElement>(".counter-value").forEach((counter) => {
        const target = parseInt(counter.getAttribute("data-target") || "0", 10);
        let current = 0;
        const increment = target / 60;
        const timer = setInterval(() => {
          current += increment;
          if (current >= target) { counter.textContent = target + "+"; clearInterval(timer); }
          else { counter.textContent = Math.floor(current) + "+"; }
        }, 30);
      });
    };
    let observer: IntersectionObserver | undefined;
    const counterEl = document.querySelector<HTMLElement>(".counter-value");
    const counterTarget = counterEl?.parentElement?.parentElement;
    if (counterTarget) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { if (entry.isIntersecting) { animate(); observer?.disconnect(); } });
      }, { threshold: 0.5 });
      observer.observe(counterTarget);
    }

    // Form submission
    const form = document.getElementById("launchpad-form") as HTMLFormElement | null;
    const onSubmit = async (e: Event) => {
      e.preventDefault();
      const submitBtn = document.getElementById("submit-btn") as HTMLButtonElement | null;
      const successDiv = document.getElementById("form-success");
      const errorDiv = document.getElementById("form-error");
      const errorText = document.getElementById("form-error-text");
      successDiv?.classList.add("hidden");
      errorDiv?.classList.add("hidden");
      if (!form) return;
      const fd = new FormData(form);
      const data: Record<string, unknown> = {
        name: fd.get("name"), email: fd.get("email"), phone: fd.get("phone"),
        city: fd.get("city"), businessType: fd.get("businessType"), source: "launchpad",
      };
      const businessName = fd.get("businessName"); if (businessName) data.businessName = businessName;
      const budgetRange = fd.get("budgetRange"); if (budgetRange) data.budgetRange = budgetRange;
      const areaInSqFt = fd.get("areaInSqFt"); if (areaInSqFt) data.areaInSqFt = parseInt(String(areaInSqFt), 10);
      const timeline = fd.get("timeline"); if (timeline) data.timeline = timeline;
      const message = fd.get("message"); if (message) data.message = message;
      const services: string[] = [];
      document.querySelectorAll<HTMLInputElement>(".service-check:checked").forEach((cb) => services.push(cb.value));
      if (services.length) data.servicesNeeded = services.join(", ");
      if (!data.name || !data.email || !data.phone || !data.city || !data.businessType) {
        if (errorText) errorText.textContent = "Please fill in all required fields.";
        errorDiv?.classList.remove("hidden");
        return;
      }
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Submitting..."; }
      try {
        const res = await fetch("/api/public/launchpad-inquiry", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
        });
        const result = await res.json();
        if (result.ok) {
          successDiv?.classList.remove("hidden");
          form.reset();
          successDiv?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          if (errorText) errorText.textContent = result.error || "Something went wrong. Please try again.";
          errorDiv?.classList.remove("hidden");
        }
      } catch {
        if (errorText) errorText.textContent = "Network error. Please check your connection and try again.";
        errorDiv?.classList.remove("hidden");
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Submit Inquiry"; }
      }
    };
    form?.addEventListener("submit", onSubmit);

    return () => {
      faqCleanups.forEach((fn) => fn());
      observer?.disconnect();
      form?.removeEventListener("submit", onSubmit);
    };
  }, []);

  return (
    <div className={`${afacad.className} max-w-[1920px] mx-auto bg-white`}>
        
            
            <SiteHeader />
        
            
            <section className="gradient-bg py-20 lg:py-32 px-5 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-10 left-10 w-32 h-32 border-2 border-white rounded-full"></div>
                <div className="absolute bottom-10 right-10 w-48 h-48 border-2 border-white rounded-full"></div>
                <div className="absolute top-1/2 left-1/3 w-20 h-20 border border-white rounded-full"></div>
              </div>
              <div className="container mx-auto text-center relative z-10">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                  Launch Your Dream<br />
                  <span className="text-[#ff6b6b]">Restaurant</span> with KNI
                </h1>
                <p className="text-xl md:text-2xl text-gray-200 mb-8 max-w-3xl mx-auto">
                  From kitchen design to equipment sourcing, AMC to manpower — we handle everything so you can focus on your food.
                </p>
                <a href="#inquiry-form" className="inline-block bg-[#E71720] hover:bg-[#c9141c] text-white px-10 py-4 rounded-full text-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                  Start Your Journey
                </a>
              </div>
            </section>
        
            
            <section className="py-16 lg:py-20 px-5 bg-gray-50">
              <div className="container mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold text-center text-[#1D2254] mb-4">What Are You Planning?</h2>
                <p className="text-gray-600 text-center mb-12 text-lg">Choose your business type and we'll tailor our services for you</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                  <div className="bg-white rounded-xl shadow-md hover:shadow-xl p-6 text-center transition-all duration-300 hover:-translate-y-2 cursor-pointer border-2 border-transparent hover:border-[#E71720]">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-[#E71720]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                    </div>
                    <h3 className="font-semibold text-[#1D2254]">Restaurant</h3>
                  </div>
                  <div className="bg-white rounded-xl shadow-md hover:shadow-xl p-6 text-center transition-all duration-300 hover:-translate-y-2 cursor-pointer border-2 border-transparent hover:border-[#E71720]">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-[#E71720]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h18v18H3zM12 8v4m0 4h.01"></path></svg>
                    </div>
                    <h3 className="font-semibold text-[#1D2254]">Cafe</h3>
                  </div>
                  <div className="bg-white rounded-xl shadow-md hover:shadow-xl p-6 text-center transition-all duration-300 hover:-translate-y-2 cursor-pointer border-2 border-transparent hover:border-[#E71720]">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-[#E71720]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path></svg>
                    </div>
                    <h3 className="font-semibold text-[#1D2254]">Cloud Kitchen</h3>
                  </div>
                  <div className="bg-white rounded-xl shadow-md hover:shadow-xl p-6 text-center transition-all duration-300 hover:-translate-y-2 cursor-pointer border-2 border-transparent hover:border-[#E71720]">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-[#E71720]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    </div>
                    <h3 className="font-semibold text-[#1D2254]">QSR</h3>
                  </div>
                  <div className="bg-white rounded-xl shadow-md hover:shadow-xl p-6 text-center transition-all duration-300 hover:-translate-y-2 cursor-pointer border-2 border-transparent hover:border-[#E71720]">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-[#E71720]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0A1.5 1.5 0 003 15.546V12a9 9 0 0118 0v3.546z"></path></svg>
                    </div>
                    <h3 className="font-semibold text-[#1D2254]">Bakery</h3>
                  </div>
                  <div className="bg-white rounded-xl shadow-md hover:shadow-xl p-6 text-center transition-all duration-300 hover:-translate-y-2 cursor-pointer border-2 border-transparent hover:border-[#E71720]">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-[#E71720]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                    </div>
                    <h3 className="font-semibold text-[#1D2254]">Catering</h3>
                  </div>
                </div>
              </div>
            </section>
        
            
            <section className="py-16 lg:py-20 px-5">
              <div className="container mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold text-center text-[#1D2254] mb-4">Why Choose KNI?</h2>
                <p className="text-gray-600 text-center mb-12 text-lg">Complete end-to-end support for your food business</p>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow border-t-4 border-[#E71720]">
                    <div className="flex justify-center mb-4">
                      <img src="/landing/assests/KitchenDesign.svg" alt="Kitchen Design" className="w-16 h-16" />
                    </div>
                    <h3 className="text-xl font-bold text-[#1D2254] mb-3">Kitchen Design</h3>
                    <p className="text-gray-600">Professional kitchen layout & design tailored to your business needs and space.</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow border-t-4 border-[#E71720]">
                    <div className="flex justify-center mb-4">
                      <img src="/landing/assests/KitchenEquipment.svg" alt="Kitchen Equipment" className="w-16 h-16" />
                    </div>
                    <h3 className="text-xl font-bold text-[#1D2254] mb-3">Equipment Sourcing</h3>
                    <p className="text-gray-600">Quality commercial kitchen equipment from trusted vendors at competitive prices.</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow border-t-4 border-[#E71720]">
                    <div className="flex justify-center mb-4">
                      <img src="/landing/assests/AnnualMaintenanceContracts.svg" alt="AMC" className="w-16 h-16" />
                    </div>
                    <h3 className="text-xl font-bold text-[#1D2254] mb-3">AMC & Maintenance</h3>
                    <p className="text-gray-600">Annual maintenance contracts ensuring your equipment runs smoothly year-round.</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow border-t-4 border-[#E71720]">
                    <div className="flex justify-center mb-4">
                      <img src="/landing/assests/ManpowerSourcing.svg" alt="Manpower" className="w-16 h-16" />
                    </div>
                    <h3 className="text-xl font-bold text-[#1D2254] mb-3">Manpower Sourcing</h3>
                    <p className="text-gray-600">Trained kitchen staff and service professionals for your business needs.</p>
                  </div>
                </div>
              </div>
            </section>
        
            
            <section className="py-16 lg:py-20 px-5 bg-gray-50">
              <div className="container mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold text-center text-[#1D2254] mb-4">How It Works</h2>
                <p className="text-gray-600 text-center mb-12 text-lg">5 simple steps to launch your food business</p>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                  <div className="timeline-step text-center">
                    <div className="w-16 h-16 bg-[#E71720] rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold shadow-lg">1</div>
                    <h3 className="font-bold text-[#1D2254] text-lg mb-2">Submit Inquiry</h3>
                    <p className="text-gray-600 text-sm">Fill the form with your requirements and business details</p>
                  </div>
                  <div className="timeline-step text-center">
                    <div className="w-16 h-16 bg-[#E71720] rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold shadow-lg">2</div>
                    <h3 className="font-bold text-[#1D2254] text-lg mb-2">Expert Call</h3>
                    <p className="text-gray-600 text-sm">Our team contacts you to understand your vision and needs</p>
                  </div>
                  <div className="timeline-step text-center">
                    <div className="w-16 h-16 bg-[#E71720] rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold shadow-lg">3</div>
                    <h3 className="font-bold text-[#1D2254] text-lg mb-2">Site Visit</h3>
                    <p className="text-gray-600 text-sm">We visit your location to assess space and finalize plans</p>
                  </div>
                  <div className="timeline-step text-center">
                    <div className="w-16 h-16 bg-[#E71720] rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold shadow-lg">4</div>
                    <h3 className="font-bold text-[#1D2254] text-lg mb-2">Proposal</h3>
                    <p className="text-gray-600 text-sm">Receive a detailed proposal with design, equipment & costs</p>
                  </div>
                  <div className="timeline-step text-center">
                    <div className="w-16 h-16 bg-[#E71720] rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold shadow-lg">5</div>
                    <h3 className="font-bold text-[#1D2254] text-lg mb-2">Launch!</h3>
                    <p className="text-gray-600 text-sm">We set up everything and your dream kitchen is ready</p>
                  </div>
                </div>
              </div>
            </section>
        
            
            <section className="py-16 lg:py-20 px-5 gradient-bg">
              <div className="container mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                  <div>
                    <p className="text-4xl md:text-5xl font-bold text-white counter-value" data-target="500">0</p>
                    <p className="text-gray-200 text-lg mt-2">Kitchens Set Up</p>
                  </div>
                  <div>
                    <p className="text-4xl md:text-5xl font-bold text-white counter-value" data-target="50">0</p>
                    <p className="text-gray-200 text-lg mt-2">Cities Covered</p>
                  </div>
                  <div>
                    <p className="text-4xl md:text-5xl font-bold text-white counter-value" data-target="1000">0</p>
                    <p className="text-gray-200 text-lg mt-2">Happy Clients</p>
                  </div>
                  <div>
                    <p className="text-4xl md:text-5xl font-bold text-white counter-value" data-target="10">0</p>
                    <p className="text-gray-200 text-lg mt-2">Years Experience</p>
                  </div>
                </div>
              </div>
            </section>
        
            
            <section id="inquiry-form" className="form-section py-16 lg:py-20 px-5">
              <div className="container mx-auto max-w-4xl">
                <h2 className="text-3xl md:text-4xl font-bold text-center text-[#1D2254] mb-4">Get Started Today</h2>
                <p className="text-gray-600 text-center mb-12 text-lg">Tell us about your dream food business and we'll help make it a reality</p>
        
                <form id="launchpad-form" className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
                  
                  <div id="form-success" className="hidden bg-green-50 border border-green-200 rounded-lg p-6 mb-6 text-center">
                    <svg className="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <h3 className="text-xl font-bold text-green-800 mb-2">Inquiry Submitted Successfully!</h3>
                    <p className="text-green-600">Our team will get in touch with you within 24 hours.</p>
                  </div>
        
                  
                  <div id="form-error" className="hidden bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p id="form-error-text" className="text-red-600 text-center"></p>
                  </div>
        
                  <div className="grid md:grid-cols-2 gap-6">
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name <span className="text-red-500">*</span></label>
                      <input type="text" name="name" required placeholder="Enter your full name"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E71720] focus:border-transparent outline-none transition" />
                    </div>
        
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address <span className="text-red-500">*</span></label>
                      <input type="email" name="email" required placeholder="your@email.com"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E71720] focus:border-transparent outline-none transition" />
                    </div>
        
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number <span className="text-red-500">*</span></label>
                      <input type="tel" name="phone" required placeholder="+91 XXXXX XXXXX"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E71720] focus:border-transparent outline-none transition" />
                    </div>
        
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">City <span className="text-red-500">*</span></label>
                      <input type="text" name="city" required placeholder="Enter your city"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E71720] focus:border-transparent outline-none transition" />
                    </div>
        
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Business Type <span className="text-red-500">*</span></label>
                      <select name="businessType" required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E71720] focus:border-transparent outline-none transition bg-white">
                        <option value="">Select business type</option>
                        <option value="RESTAURANT">Restaurant</option>
                        <option value="CAFE">Cafe</option>
                        <option value="CLOUD_KITCHEN">Cloud Kitchen</option>
                        <option value="QSR">Quick Service Restaurant (QSR)</option>
                        <option value="BAKERY">Bakery</option>
                        <option value="CATERING">Catering</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
        
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Business Name</label>
                      <input type="text" name="businessName" placeholder="Your business name (if decided)"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E71720] focus:border-transparent outline-none transition" />
                    </div>
        
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Budget Range</label>
                      <select name="budgetRange"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E71720] focus:border-transparent outline-none transition bg-white">
                        <option value="">Select budget range</option>
                        <option value="UNDER_5L">Under 5 Lakhs</option>
                        <option value="L5_TO_10L">5 - 10 Lakhs</option>
                        <option value="L10_TO_25L">10 - 25 Lakhs</option>
                        <option value="L25_TO_50L">25 - 50 Lakhs</option>
                        <option value="L50_TO_1CR">50 Lakhs - 1 Crore</option>
                        <option value="ABOVE_1CR">Above 1 Crore</option>
                      </select>
                    </div>
        
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Kitchen Area (sq ft)</label>
                      <input type="number" name="areaInSqFt" placeholder="e.g. 500"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E71720] focus:border-transparent outline-none transition" />
                    </div>
        
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">When do you plan to start?</label>
                      <select name="timeline"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E71720] focus:border-transparent outline-none transition bg-white">
                        <option value="">Select timeline</option>
                        <option value="IMMEDIATELY">Immediately</option>
                        <option value="WITHIN_1_MONTH">Within 1 Month</option>
                        <option value="WITHIN_3_MONTHS">Within 3 Months</option>
                        <option value="WITHIN_6_MONTHS">Within 6 Months</option>
                        <option value="WITHIN_1_YEAR">Within 1 Year</option>
                        <option value="JUST_EXPLORING">Just Exploring</option>
                      </select>
                    </div>
                  </div>
        
                  
                  <div className="mt-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Services You Need</label>
                    <div className="flex flex-wrap gap-3">
                      <input type="checkbox" id="svc-design" value="Kitchen Design" className="service-check hidden" />
                      <label htmlFor="svc-design" className="px-4 py-2 border-2 border-gray-300 rounded-full cursor-pointer hover:border-[#E71720] transition-all text-sm font-medium">Kitchen Design</label>
        
                      <input type="checkbox" id="svc-equipment" value="Equipment Sourcing" className="service-check hidden" />
                      <label htmlFor="svc-equipment" className="px-4 py-2 border-2 border-gray-300 rounded-full cursor-pointer hover:border-[#E71720] transition-all text-sm font-medium">Equipment Sourcing</label>
        
                      <input type="checkbox" id="svc-amc" value="AMC" className="service-check hidden" />
                      <label htmlFor="svc-amc" className="px-4 py-2 border-2 border-gray-300 rounded-full cursor-pointer hover:border-[#E71720] transition-all text-sm font-medium">AMC & Maintenance</label>
        
                      <input type="checkbox" id="svc-manpower" value="Manpower Sourcing" className="service-check hidden" />
                      <label htmlFor="svc-manpower" className="px-4 py-2 border-2 border-gray-300 rounded-full cursor-pointer hover:border-[#E71720] transition-all text-sm font-medium">Manpower Sourcing</label>
        
                      <input type="checkbox" id="svc-consulting" value="Business Consulting" className="service-check hidden" />
                      <label htmlFor="svc-consulting" className="px-4 py-2 border-2 border-gray-300 rounded-full cursor-pointer hover:border-[#E71720] transition-all text-sm font-medium">Business Consulting</label>
        
                      <input type="checkbox" id="svc-licensing" value="Licensing & Compliance" className="service-check hidden" />
                      <label htmlFor="svc-licensing" className="px-4 py-2 border-2 border-gray-300 rounded-full cursor-pointer hover:border-[#E71720] transition-all text-sm font-medium">Licensing & Compliance</label>
                    </div>
                  </div>
        
                  
                  <div className="mt-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Additional Message</label>
                    <textarea name="message" rows={4} placeholder="Tell us more about your vision, special requirements, etc."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E71720] focus:border-transparent outline-none transition resize-none"></textarea>
                  </div>
        
                  
                  <div className="mt-8">
                    <button type="submit" id="submit-btn"
                      className="w-full bg-[#E71720] hover:bg-[#c9141c] text-white py-4 rounded-lg text-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed">
                      Submit Inquiry
                    </button>
                  </div>
                </form>
              </div>
            </section>
        
            
            <section className="py-16 lg:py-20 px-5 bg-gray-50">
              <div className="container mx-auto max-w-3xl">
                <h2 className="text-3xl md:text-4xl font-bold text-center text-[#1D2254] mb-12">Frequently Asked Questions</h2>
        
                <div className="space-y-4">
                  <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <button className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50">
                      <span className="font-semibold text-[#1D2254]">What types of food businesses does KNI support?</span>
                      <svg className="faq-arrow w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    <div className="faq-answer px-6 pb-4">
                      <p className="text-gray-600">KNI supports all types of food businesses including restaurants, cafes, cloud kitchens, QSRs, bakeries, catering companies, and more. Whether you're opening your first outlet or expanding, we've got you covered.</p>
                    </div>
                  </div>
        
                  <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <button className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50">
                      <span className="font-semibold text-[#1D2254]">How long does it take from inquiry to kitchen setup?</span>
                      <svg className="faq-arrow w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    <div className="faq-answer px-6 pb-4">
                      <p className="text-gray-600">Depending on the size and complexity, a typical kitchen setup takes 4-12 weeks from finalized proposal to ready-to-use kitchen. Our team will provide you with a detailed timeline during the proposal stage.</p>
                    </div>
                  </div>
        
                  <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <button className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50">
                      <span className="font-semibold text-[#1D2254]">Do you help with kitchen design and layout?</span>
                      <svg className="faq-arrow w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    <div className="faq-answer px-6 pb-4">
                      <p className="text-gray-600">Yes! Our expert team designs commercial kitchen layouts optimized for workflow, safety, and efficiency. We take into account your menu, expected volume, space constraints, and local regulations.</p>
                    </div>
                  </div>
        
                  <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <button className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50">
                      <span className="font-semibold text-[#1D2254]">What is included in the AMC (Annual Maintenance Contract)?</span>
                      <svg className="faq-arrow w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    <div className="faq-answer px-6 pb-4">
                      <p className="text-gray-600">Our AMC covers periodic preventive maintenance visits, emergency breakdown support, equipment health checks, and priority service. Plans are customizable based on your equipment and business needs.</p>
                    </div>
                  </div>
        
                  <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <button className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50">
                      <span className="font-semibold text-[#1D2254]">Can KNI help with staff recruitment?</span>
                      <svg className="faq-arrow w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    <div className="faq-answer px-6 pb-4">
                      <p className="text-gray-600">Yes, we help source trained kitchen staff including chefs, line cooks, kitchen helpers, and maintenance personnel. We can also assist with training programs for your team.</p>
                    </div>
                  </div>
        
                  <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <button className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50">
                      <span className="font-semibold text-[#1D2254]">Is there any cost for the initial consultation?</span>
                      <svg className="faq-arrow w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    <div className="faq-answer px-6 pb-4">
                      <p className="text-gray-600">No, the initial consultation call is completely free. Submit your inquiry and our team will reach out to understand your needs before providing any quotation.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
        
            
            <section className="py-16 lg:py-20 px-5 bg-[#E71720]">
              <div className="container mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Launch Your Food Business?</h2>
                <p className="text-white/90 text-xl mb-8">Join hundreds of successful food entrepreneurs who trusted KNI</p>
                <a href="#inquiry-form" className="inline-block bg-white text-[#E71720] px-10 py-4 rounded-full text-xl font-semibold hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                  Submit Your Inquiry Now
                </a>
              </div>
            </section>
        
            
            <footer className="bg-[#5A5758] py-8 px-4">
              <div className="container mx-auto max-w-6xl">
                <div className="flex justify-center mb-6">
                  <img src="/landing/assests/footerknilogo.webp" alt="KNI logo" className="w-52 sm:w-auto" />
                </div>
                <div className="text-center mb-8 max-w-4xl mx-auto">
                  <p className="text-white text-sm md:text-base leading-relaxed">
                    KNI is a specialized platform bridging the gap between commercial
                    kitchen owners and service professionals, offering streamlined
                    solutions for service bookings, equipment needs, and operational
                    challenges ensuring efficiency and reliability across the industry.
                  </p>
                </div>
                <div className="border-t-2 border-[#7F7C7D] max-w-6xl mx-auto mb-6"></div>
                <div className="text-center">
                  <p className="text-white text-sm">
                    &copy; Copyright 2026 Kitchen Network International. All rights reserved.
                  </p>
                  <div className="mt-4 space-x-4">
                    <a href="/" className="text-white hover:text-[#E71720] text-sm transition-colors">Home</a>
                    <span className="text-gray-400">|</span>
                    <a href="/privacy-policy" className="text-white hover:text-[#E71720] text-sm transition-colors">Privacy Policy</a>
                    <span className="text-gray-400">|</span>
                    <a href="/terms" className="text-white hover:text-[#E71720] text-sm transition-colors">Terms of Service</a>
                    <span className="text-gray-400">|</span>
                    <a href="/refund-policy" className="text-white hover:text-[#E71720] text-sm transition-colors">Refund Policy</a>
                    <span className="text-gray-400">|</span>
                    <a href="/cancellation-policy" className="text-white hover:text-[#E71720] text-sm transition-colors">Cancellation Policy</a>
                  </div>
                </div>
              </div>
            </footer>
        
            
          
    </div>
  );
}
