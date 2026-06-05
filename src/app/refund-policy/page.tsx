import type { Metadata } from "next";
import { Afacad } from "next/font/google";
import "./styles.css";
import SiteHeader from "../_components/SiteHeader";

const afacad = Afacad({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kniservices.com";

export const metadata: Metadata = {
  title: 'Refund Policy | KNI',
  description: 'Refund Policy of Kitchen Network International (KNI).',
  alternates: { canonical: `${SITE_URL}/refund-policy` },
};

export default function Page() {
  return (
    <div className={`${afacad.className} `}>
      
          <SiteHeader />
      
          <section className="hero">
            <h1>Refund Policy</h1>
            <p>Eligibility, processing time, and modes of refund for Kitchen Network International services and marketplace orders.</p>
            <div className="meta">Last updated: 2 May 2026</div>
          </section>
      
          <main>
      
            <p>At <strong>Kitchen Network International Services Pvt. Ltd. (KNI)</strong>, we strive to provide high-quality services and ensure customer satisfaction. This Refund Policy outlines when refunds are issued, the processing time, and the mode of refund for both our services (AMC, Projects, Installations) and our marketplace product orders.</p>
      
            <h2>1. Refund Eligibility — Services</h2>
            <p>Refunds will be processed for services in the following cases:</p>
            <ul>
              <li>The service is cancelled within the allowed cancellation time frame.</li>
              <li>KNI is unable to deliver the committed service.</li>
            </ul>
      
            <h3>Non-Refundable Cases (Services)</h3>
            <ul>
              <li>Services already rendered or completed.</li>
              <li>Custom orders or fabricated kitchen equipment.</li>
              <li>Advance payments for booked manpower or materials.</li>
            </ul>
      
            <h3>Partial Refunds (Services)</h3>
            <p>In case of partial work completion, the refund amount will be processed after deducting:</p>
            <ul>
              <li>Service charges for the work completed.</li>
              <li>Material costs already incurred.</li>
              <li>Labour charges for the work completed.</li>
            </ul>
      
            <h2>2. Refund Eligibility — Marketplace / Products</h2>
            <p>Refunds for marketplace product orders are issued in the following cases:</p>
            <ul>
              <li>Order cancelled before dispatch.</li>
              <li>Approved return due to product damage during transit or wrong item delivered.</li>
            </ul>
      
            <h3>Partial Refunds (Marketplace)</h3>
            <ul>
              <li>Deduction of shipping, handling, or restocking charges may apply.</li>
            </ul>
      
            <h3>No Refund Cases (Marketplace)</h3>
            <ul>
              <li>For used products after delivery.</li>
              <li>For delays caused by third-party logistics partners.</li>
            </ul>
      
            <h2>3. Replacement Policy</h2>
            <p>In case of a damaged or incorrect product:</p>
            <ul>
              <li>A replacement will be provided subject to stock availability.</li>
              <li>If a replacement is not available, a refund will be processed instead.</li>
            </ul>
      
            <h2>4. Refund Processing Time</h2>
            <p>Approved refunds will be processed within <strong>7 to 10 working days</strong> from the date of approval. This applies to both services and marketplace orders.</p>
      
            <h2>5. Mode of Refund</h2>
            <p>Refunds are credited via the original payment method used during the transaction:</p>
            <ul>
              <li>Online payments (UPI, cards, netbanking, wallets) will be refunded to the original payment source.</li>
              <li>Offline payments will be refunded via direct bank transfer to the customer's account.</li>
            </ul>
      
            <h2>6. How to Request a Refund</h2>
            <p>To request a refund, please contact our support team with your order details:</p>
            <ul>
              <li>Provide the order ID or service booking ID.</li>
              <li>Provide a reason for the refund request.</li>
              <li>For damaged or wrong products, provide photos and videos as proof within 48 hours of delivery.</li>
            </ul>
      
            <h2>7. Contact Us</h2>
            <p>For any refund requests or questions about this policy, please contact us at:</p>
            <div className="contact-box">
              <p><strong>Kitchen Network International Services Pvt. Ltd.</strong></p>
              <p>Email: <a href="mailto:info@kniservices.com">info@kniservices.com</a></p>
              <p>Phone: <a href="tel:+918001700002">+91 80017 00002</a></p>
            </div>
      
            <p style={{marginTop: '24px'}}>For details about cancellation timelines and rules, please see our <a href="/cancellation-policy" style={{color: '#E71720', fontWeight: '600'}}>Cancellation Policy</a>.</p>
          </main>
      
          <footer>
            <img src="/landing/assests/footerknilogo.webp" alt="KNI Logo" />
            <p className="copyright">&copy; Copyright 2026 Kitchen Network International. All rights reserved.</p>
            <div className="links">
              <a href="/">Home</a>
              <span className="sep">|</span>
              <a href="/privacy-policy">Privacy Policy</a>
              <span className="sep">|</span>
              <a href="/terms">Terms of Service</a>
              <span className="sep">|</span>
              <a href="/refund-policy">Refund Policy</a>
              <span className="sep">|</span>
              <a href="/cancellation-policy">Cancellation Policy</a>
            </div>
          </footer>
        
    </div>
  );
}
