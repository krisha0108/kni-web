import type { Metadata } from "next";
import { Afacad } from "next/font/google";
import "./landing.css";
import Navbar from "./_components/Navbar";
import Hero from "./_components/Hero";
import HeroCards from "./_components/HeroCards";
import About from "./_components/About";
import VisionMission from "./_components/VisionMission";
import SectionA from "./_components/SectionA";
import Services from "./_components/Services";
import HowKni from "./_components/HowKni";
import Process from "./_components/Process";
import Achievements from "./_components/Achievements";
import Clients from "./_components/Clients";
import Testimonials from "./_components/Testimonials";
import Faq from "./_components/Faq";
import LatestBlog from "./_components/LatestBlog";
import Contact from "./_components/Contact";
import Footer from "./_components/Footer";
import ScrollToTop from "./_components/ScrollToTop";
import LandingClient from "./_components/LandingClient";

const afacad = Afacad({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kniservices.com";

// Testimonials pulls live data from the database (real Owner reviews) — without
// this, Next.js would statically render the homepage once at build time and the
// testimonials would only ever update on the next deploy, not as real reviews
// come in.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Commercial Kitchen Equipment, AMC & Service | KNI",
  description:
    "Kitchen Network International (KNI) is India's B2B marketplace for commercial kitchen equipment, AMC, maintenance, kitchen layout design, manpower & MEP solutions. Serving restaurants & hotels from Ahmedabad, Gujarat.",
  alternates: { canonical: `${SITE_URL}/` },
  openGraph: {
    type: "website",
    siteName: "Kitchen Network International",
    title: "Commercial Kitchen Equipment, AMC & Service | KNI",
    description:
      "India's B2B marketplace for commercial kitchen equipment, AMC, maintenance, layout design, manpower & MEP solutions. Based in Ahmedabad, Gujarat.",
    url: `${SITE_URL}/`,
    images: [`${SITE_URL}/landing/assests/Kni-red-logo.webp`],
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": ["Organization", "LocalBusiness"],
  "@id": `${SITE_URL}/#organization`,
  name: "Kitchen Network International (KNI)",
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/landing/assests/Kni-red-logo.webp`,
  image: `${SITE_URL}/landing/assests/Kni-red-logo.webp`,
  description:
    "B2B marketplace for commercial kitchen equipment, service, maintenance (AMC), layout design, manpower sourcing and MEP solutions.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "ANOLI COMPLEX, A/2, Sunrise Park Road, nr. SANJIVANI HOSPITAL, Sunrise Park, Vastrapur",
    addressLocality: "Ahmedabad",
    addressRegion: "Gujarat",
    postalCode: "380054",
    addressCountry: "IN",
  },
  telephone: "+91-8001700002",
  email: "info@kniservices.com",
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+91-8001700002",
    contactType: "customer service",
    email: "info@kniservices.com",
    availableLanguage: ["English", "Hindi", "Gujarati"],
  },
  sameAs: [
    "https://www.facebook.com/profile.php?id=61572489517404",
    "https://www.instagram.com/kni_services/",
    "https://www.linkedin.com/in/kni-kitchen-network-international-887a58349/",
    "https://www.youtube.com/@kitchennetworkinternational",
  ],
};

export default function Home() {
  return (
    <div className={`${afacad.className} max-w-[1920px] mx-auto bg-white text-gray-900`}>
      <a
        href="#home"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-[#E71720] focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      {/* Hero region: video background + fixed navbar + hero heading + hero cards */}
      <div className="relative w-full opacity-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/landing/assests/hero-poster.webp"
          aria-label="Commercial Kitchen"
          className="absolute top-0 left-0 w-full h-[700px] md:h-[650px] object-cover z-0"
          src="/landing/assests/Commercial Kitchen 2.mp4"
        />
        <Navbar />
        <Hero />
        <HeroCards />
      </div>

      <About />
      <VisionMission />
      <SectionA />
      <Services />
      <HowKni />
      <Process />
      <Achievements />
      <Clients />
      <Testimonials />
      <Faq />
      <LatestBlog />
      <Contact />
      <Footer />

      <ScrollToTop />
      <LandingClient />
    </div>
  );
}
