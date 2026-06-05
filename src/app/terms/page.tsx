import type { Metadata } from "next";
import { Afacad } from "next/font/google";
import "./styles.css";
import SiteHeader from "../_components/SiteHeader";

const afacad = Afacad({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kniservices.com";

export const metadata: Metadata = {
  title: 'Terms of Service | KNI',
  description: 'Terms of Service for Kitchen Network International (KNI) commercial kitchen marketplace.',
  alternates: { canonical: `${SITE_URL}/terms` },
};

export default function Page() {
  return (
    <div className={`${afacad.className} max-w-[1920px] mx-auto bg-gray-50`}>
      
          
          <SiteHeader />
      
          
          <section className="policy-hero hero-pattern relative text-white py-16 lg:py-24 px-5 lg:px-16 overflow-hidden">
            <div className="container mx-auto max-w-5xl relative z-10">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-1.5 rounded-full text-sm mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Legal &amp; Compliance
              </div>
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight mb-4">Terms of Service</h1>
              <p className="text-lg lg:text-xl text-white/80 max-w-3xl leading-relaxed mb-6">
                The rules and conditions that govern your use of the KNI platform.
                Please read carefully — using our services means you accept these terms.
              </p>
              <div className="inline-flex items-center gap-2 text-sm text-white/70">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Last updated: January 2025
              </div>
            </div>
          </section>
      
          
          <div className="bg-white border-b border-gray-200 sticky top-[72px] lg:top-[80px] z-40">
            <div className="container mx-auto max-w-5xl px-5 lg:px-16 py-4 overflow-x-auto">
              <div className="flex items-center gap-2 text-sm whitespace-nowrap">
                <span className="text-gray-500 font-medium pr-2">On this page:</span>
                <a href="#section-1" className="toc-pill px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">Acceptance</a>
                <a href="#section-2" className="toc-pill px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">Service</a>
                <a href="#section-3" className="toc-pill px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">Accounts</a>
                <a href="#section-4" className="toc-pill px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">Bookings</a>
                <a href="#section-5" className="toc-pill px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">Payments</a>
                <a href="#section-6" className="toc-pill px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">Conduct</a>
                <a href="#section-9" className="toc-pill px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">Liability</a>
                <a href="#contact" className="toc-pill px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">Contact</a>
              </div>
            </div>
          </div>
      
          
          <main className="container mx-auto px-5 lg:px-16 py-12 lg:py-16 max-w-5xl">
            <div className="space-y-6">
      
              <article id="section-1" className="scroll-mt section-card bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="num-badge flex-shrink-0 w-10 h-10 rounded-full text-white font-bold flex items-center justify-center text-base">1</div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Acceptance of Terms</h2>
                    <p className="text-gray-700 leading-relaxed">
                      By accessing and using the <strong>Kitchen Network International (KNI)</strong> platform, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, please do not use our services.
                    </p>
                  </div>
                </div>
              </article>
      
              <article id="section-2" className="scroll-mt section-card bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="num-badge flex-shrink-0 w-10 h-10 rounded-full text-white font-bold flex items-center justify-center text-base">2</div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Description of Service</h2>
                    <p className="text-gray-700 leading-relaxed">
                      KNI provides a platform that connects commercial kitchen owners with qualified service professionals, including equipment repair, maintenance, and related services. Our platform facilitates service bookings, communication, and payment processing between users and service providers.
                    </p>
                  </div>
                </div>
              </article>
      
              <article id="section-3" className="scroll-mt section-card bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="num-badge flex-shrink-0 w-10 h-10 rounded-full text-white font-bold flex items-center justify-center text-base">3</div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">User Accounts</h2>
                    <p className="text-gray-700 leading-relaxed mb-4">To use certain features of our platform, you must:</p>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Register for an account with accurate and complete information</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Maintain the security of your account credentials</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Notify us immediately of any unauthorized access</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Be responsible for all activities under your account</span></li>
                    </ul>
                  </div>
                </div>
              </article>
      
              <article id="section-4" className="scroll-mt section-card bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="num-badge flex-shrink-0 w-10 h-10 rounded-full text-white font-bold flex items-center justify-center text-base">4</div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Service Bookings</h2>
                    <p className="text-gray-700 leading-relaxed mb-4">When booking services through our platform:</p>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>You agree to provide accurate information about your service requirements</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Service prices and availability are subject to change</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Cancellation policies may apply as specified at the time of booking</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>KNI acts as an intermediary and is not directly responsible for service quality</span></li>
                    </ul>
                  </div>
                </div>
              </article>
      
              <article id="section-5" className="scroll-mt section-card bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="num-badge flex-shrink-0 w-10 h-10 rounded-full text-white font-bold flex items-center justify-center text-base">5</div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Payments</h2>
                    <p className="text-gray-700 leading-relaxed mb-4">Regarding payments on our platform:</p>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>All prices are displayed in Indian Rupees (INR) unless otherwise stated</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Payment must be made through approved payment methods</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>You agree to pay all charges incurred through your account</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Refunds are subject to our refund policy and service provider terms</span></li>
                    </ul>
                    <a href="/refund-policy" className="inline-flex items-center gap-1 mt-4 text-[#E71720] font-semibold hover:underline">
                      Read full Refund &amp; Cancellation Policy
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </a>
                  </div>
                </div>
              </article>
      
              <article id="section-6" className="scroll-mt section-card bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="num-badge flex-shrink-0 w-10 h-10 rounded-full text-white font-bold flex items-center justify-center text-base">6</div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">User Conduct</h2>
                    <p className="text-gray-700 leading-relaxed mb-4">You agree not to:</p>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Use the platform for any unlawful purpose</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Harass, abuse, or harm other users or service providers</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Provide false or misleading information</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Interfere with the proper functioning of the platform</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Attempt to gain unauthorized access to any part of the platform</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Use automated systems to access the platform without permission</span></li>
                    </ul>
                  </div>
                </div>
              </article>
      
              <article id="section-7" className="scroll-mt section-card bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="num-badge flex-shrink-0 w-10 h-10 rounded-full text-white font-bold flex items-center justify-center text-base">7</div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Service Provider Terms</h2>
                    <p className="text-gray-700 leading-relaxed">
                      Service providers (engineers, vendors) on our platform are independent contractors, not employees of KNI. While we verify credentials and maintain quality standards, KNI is not liable for the actions, omissions, or negligence of service providers.
                    </p>
                  </div>
                </div>
              </article>
      
              <article id="section-8" className="scroll-mt section-card bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="num-badge flex-shrink-0 w-10 h-10 rounded-full text-white font-bold flex items-center justify-center text-base">8</div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Intellectual Property</h2>
                    <p className="text-gray-700 leading-relaxed">
                      All content on the KNI platform, including text, graphics, logos, and software, is the property of KNI or its licensors and is protected by intellectual property laws. You may not copy, modify, or distribute any content without prior written consent.
                    </p>
                  </div>
                </div>
              </article>
      
              <article id="section-9" className="scroll-mt section-card bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="num-badge flex-shrink-0 w-10 h-10 rounded-full text-white font-bold flex items-center justify-center text-base">9</div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Limitation of Liability</h2>
                    <p className="text-gray-700 leading-relaxed">
                      To the maximum extent permitted by law, KNI shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities, arising from your use of the platform.
                    </p>
                  </div>
                </div>
              </article>
      
              <article id="section-10" className="scroll-mt section-card bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="num-badge flex-shrink-0 w-10 h-10 rounded-full text-white font-bold flex items-center justify-center text-base">10</div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Indemnification</h2>
                    <p className="text-gray-700 leading-relaxed">
                      You agree to indemnify and hold harmless KNI, its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the platform or violation of these terms.
                    </p>
                  </div>
                </div>
              </article>
      
              <article id="section-11" className="scroll-mt section-card bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="num-badge flex-shrink-0 w-10 h-10 rounded-full text-white font-bold flex items-center justify-center text-base">11</div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Termination</h2>
                    <p className="text-gray-700 leading-relaxed">
                      We reserve the right to suspend or terminate your account at any time for violation of these terms or for any other reason at our sole discretion. Upon termination, your right to use the platform will immediately cease.
                    </p>
                  </div>
                </div>
              </article>
      
              <article id="section-12" className="scroll-mt section-card bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="num-badge flex-shrink-0 w-10 h-10 rounded-full text-white font-bold flex items-center justify-center text-base">12</div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Governing Law</h2>
                    <p className="text-gray-700 leading-relaxed">
                      These terms shall be governed by and construed in accordance with the laws of India. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts in India.
                    </p>
                  </div>
                </div>
              </article>
      
              <article id="section-13" className="scroll-mt section-card bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="num-badge flex-shrink-0 w-10 h-10 rounded-full text-white font-bold flex items-center justify-center text-base">13</div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Changes to Terms</h2>
                    <p className="text-gray-700 leading-relaxed">
                      We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting on the platform. Your continued use of the platform after changes constitutes acceptance of the modified terms.
                    </p>
                  </div>
                </div>
              </article>
      
              
              <article id="contact" className="scroll-mt contact-card text-white rounded-2xl p-6 lg:p-10 mt-10">
                <div className="relative z-10 max-w-3xl">
                  <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1 rounded-full text-xs mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Get in touch
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-bold mb-3">Have questions about our Terms?</h2>
                  <p className="text-white/80 mb-6 leading-relaxed">
                    If you have any questions about these Terms of Service or need legal clarification, our team is here to help.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <a href="mailto:info@kniservices.com" className="bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl p-4 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#E71720] flex items-center justify-center flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-white/60">Email us</p>
                          <p className="font-semibold group-hover:text-[#EF3A3A] transition-colors">info@kniservices.com</p>
                        </div>
                      </div>
                    </a>
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#E71720] flex items-center justify-center flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-white/60">Call us</p>
                          <p className="font-semibold">+91 80017 00002</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="mt-6 text-sm text-white/60">Kitchen Network International Services Pvt. Ltd.</p>
                </div>
              </article>
      
            </div>
          </main>
      
          
          <footer className="bg-[#5A5758] py-10 px-4 mt-8">
            <div className="container mx-auto max-w-6xl">
              <div className="flex justify-center mb-6">
                <img src="/landing/assests/footerknilogo.webp" alt="KNI logo" className="w-52 sm:w-auto" />
              </div>
              <div className="border-t-2 border-[#7F7C7D] max-w-6xl mx-auto mb-6"></div>
              <div className="text-center">
                <p className="text-white text-sm">
                  &copy; Copyright 2026 Kitchen Network International. All rights reserved.
                </p>
                <div className="mt-4 flex flex-wrap justify-center items-center gap-x-4 gap-y-2">
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
