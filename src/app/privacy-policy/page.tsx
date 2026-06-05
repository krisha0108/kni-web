import type { Metadata } from "next";
import { Afacad } from "next/font/google";
import "./styles.css";
import SiteHeader from "../_components/SiteHeader";

const afacad = Afacad({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kniservices.com";

export const metadata: Metadata = {
  title: 'Privacy Policy | KNI',
  description: 'Privacy Policy of Kitchen Network International (KNI) — how we collect, use and protect your data.',
  alternates: { canonical: `${SITE_URL}/privacy-policy` },
};

export default function Page() {
  return (
    <div className={`${afacad.className} max-w-[1920px] mx-auto bg-gray-50`}>
      
          
          
          
          <SiteHeader />
      
          
          
          
          <section className="policy-hero hero-pattern relative text-white py-16 lg:py-24 px-5 lg:px-16 overflow-hidden">
            <div className="container mx-auto max-w-5xl relative z-10">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-1.5 rounded-full text-sm mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Legal &amp; Privacy
              </div>
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight mb-4">Privacy Policy</h1>
              <p className="text-lg lg:text-xl text-white/80 max-w-3xl leading-relaxed mb-6">
                We are committed to protecting your personal information and your right to privacy.
                This policy explains how we collect, use, and safeguard your data on the KNI platform.
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
                <a href="#section-1" className="toc-pill px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">Introduction</a>
                <a href="#section-2" className="toc-pill px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">What We Collect</a>
                <a href="#section-3" className="toc-pill px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">How We Use It</a>
                <a href="#section-4" className="toc-pill px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">Sharing</a>
                <a href="#section-5" className="toc-pill px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">Security</a>
                <a href="#section-7" className="toc-pill px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">Your Rights</a>
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
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Introduction</h2>
                    <p className="text-gray-700 leading-relaxed">
                      Welcome to <strong>Kitchen Network International (KNI)</strong>. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform and services.
                    </p>
                  </div>
                </div>
              </article>
      
              <article id="section-2" className="scroll-mt section-card bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="num-badge flex-shrink-0 w-10 h-10 rounded-full text-white font-bold flex items-center justify-center text-base">2</div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Information We Collect</h2>
                    <p className="text-gray-700 leading-relaxed mb-4">We collect information that you provide directly to us, including:</p>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Personal identification information (name, email address, phone number)</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Business information (restaurant name, address, equipment details)</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Account credentials</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Payment information</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Service booking history and preferences</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Communication records with our support team</span></li>
                    </ul>
                  </div>
                </div>
              </article>
      
              <article id="section-3" className="scroll-mt section-card bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="num-badge flex-shrink-0 w-10 h-10 rounded-full text-white font-bold flex items-center justify-center text-base">3</div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">How We Use Your Information</h2>
                    <p className="text-gray-700 leading-relaxed mb-4">We use the information we collect to:</p>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Provide, maintain, and improve our services</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Process service bookings and payments</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Connect you with qualified service professionals</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Send you technical notices, updates, and support messages</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Respond to your comments, questions, and customer service requests</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Monitor and analyze trends, usage, and activities</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Detect, investigate, and prevent fraudulent transactions and abuse</span></li>
                    </ul>
                  </div>
                </div>
              </article>
      
              <article id="section-4" className="scroll-mt section-card bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="num-badge flex-shrink-0 w-10 h-10 rounded-full text-white font-bold flex items-center justify-center text-base">4</div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Information Sharing</h2>
                    <p className="text-gray-700 leading-relaxed mb-4">We may share your information in the following situations:</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p className="font-semibold text-gray-900 mb-1">With Service Providers</p>
                        <p className="text-sm text-gray-600">We share information with service engineers and vendors to fulfill your service requests.</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p className="font-semibold text-gray-900 mb-1">For Business Transfers</p>
                        <p className="text-sm text-gray-600">In connection with any merger, sale of company assets, or acquisition.</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p className="font-semibold text-gray-900 mb-1">For Legal Requirements</p>
                        <p className="text-sm text-gray-600">To comply with applicable laws, regulations, or legal processes.</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p className="font-semibold text-gray-900 mb-1">With Your Consent</p>
                        <p className="text-sm text-gray-600">We may share information for other purposes with your explicit consent.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
      
              <article id="section-5" className="scroll-mt section-card bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="num-badge flex-shrink-0 w-10 h-10 rounded-full text-white font-bold flex items-center justify-center text-base">5</div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Data Security</h2>
                    <p className="text-gray-700 leading-relaxed">
                      We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
                    </p>
                  </div>
                </div>
              </article>
      
              <article id="section-6" className="scroll-mt section-card bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="num-badge flex-shrink-0 w-10 h-10 rounded-full text-white font-bold flex items-center justify-center text-base">6</div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Data Retention</h2>
                    <p className="text-gray-700 leading-relaxed">
                      We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. When we no longer need your information, we will securely delete or anonymize it.
                    </p>
                  </div>
                </div>
              </article>
      
              <article id="section-7" className="scroll-mt section-card bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="num-badge flex-shrink-0 w-10 h-10 rounded-full text-white font-bold flex items-center justify-center text-base">7</div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Your Rights</h2>
                    <p className="text-gray-700 leading-relaxed mb-4">You have the right to:</p>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Access and receive a copy of your personal data</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Request correction of inaccurate personal data</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Request deletion of your personal data</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Object to processing of your personal data</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Request restriction of processing your personal data</span></li>
                      <li className="flex items-start gap-2"><span className="text-[#E71720] font-bold mt-1">›</span><span>Withdraw consent at any time</span></li>
                    </ul>
                  </div>
                </div>
              </article>
      
              <article id="section-8" className="scroll-mt section-card bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="num-badge flex-shrink-0 w-10 h-10 rounded-full text-white font-bold flex items-center justify-center text-base">8</div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Cookies and Tracking</h2>
                    <p className="text-gray-700 leading-relaxed">
                      We use cookies and similar tracking technologies to track activity on our platform and hold certain information. Cookies are files with a small amount of data that are sent to your browser from a website and stored on your device. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
                    </p>
                  </div>
                </div>
              </article>
      
              <article id="section-9" className="scroll-mt section-card bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="num-badge flex-shrink-0 w-10 h-10 rounded-full text-white font-bold flex items-center justify-center text-base">9</div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Third-Party Services</h2>
                    <p className="text-gray-700 leading-relaxed">
                      Our platform may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to read the privacy policies of any third-party services you access through our platform.
                    </p>
                  </div>
                </div>
              </article>
      
              <article id="section-10" className="scroll-mt section-card bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="num-badge flex-shrink-0 w-10 h-10 rounded-full text-white font-bold flex items-center justify-center text-base">10</div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Children's Privacy</h2>
                    <p className="text-gray-700 leading-relaxed">
                      Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
                    </p>
                  </div>
                </div>
              </article>
      
              <article id="section-11" className="scroll-mt section-card bg-white rounded-2xl border border-gray-200 p-6 lg:p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="num-badge flex-shrink-0 w-10 h-10 rounded-full text-white font-bold flex items-center justify-center text-base">11</div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Changes to This Policy</h2>
                    <p className="text-gray-700 leading-relaxed">
                      We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
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
                  <h2 className="text-2xl lg:text-3xl font-bold mb-3">Have questions about your privacy?</h2>
                  <p className="text-white/80 mb-6 leading-relaxed">
                    If you have any questions about this Privacy Policy or our privacy practices, our team is here to help.
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
