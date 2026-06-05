import type { Metadata } from "next";
import { Afacad } from "next/font/google";
import "./styles.css";
import SiteHeader from "../_components/SiteHeader";

const afacad = Afacad({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kniservices.com";

export const metadata: Metadata = {
  title: 'Cancellation Policy | KNI',
  description: 'Cancellation Policy of Kitchen Network International (KNI).',
  alternates: { canonical: `${SITE_URL}/cancellation-policy` },
};

export default function Page() {
  return (
    <div className={`${afacad.className} `}>
      
          <SiteHeader />
      
          <section className="hero">
            <h1>Cancellation Policy</h1>
            <p>Clear guidelines for cancelling services and marketplace orders on the Kitchen Network International platform.</p>
            <div className="meta">Last updated: 2 May 2026</div>
          </section>
      
          <main>
      
            <p>At <strong>Kitchen Network International Services Pvt. Ltd. (KNI)</strong>, we strive to provide high-quality services and ensure customer satisfaction. This Cancellation Policy outlines the terms and conditions under which customers can cancel orders and service bookings on our platform.</p>
      
            <h2>1. Service Cancellation — AMC, Projects, Installations</h2>
      
            <h3>Before Work Commencement</h3>
            <p>Customers may cancel a confirmed service order within <strong>24 to 48 hours</strong> of order confirmation, provided no work has been started by KNI.</p>
      
            <h3>After Work Commencement</h3>
            <p>Once a service order is confirmed and work has been initiated, cancellation requests will be reviewed on a case-to-case basis. Charges for work already completed, manpower deployed, or materials procured will be deducted from any refund.</p>
      
            <h3>Emergency / Same-Day Services</h3>
            <p>Services booked for immediate or same-day execution are non-cancellable once confirmed.</p>
      
            <h2>2. Order Cancellation — Marketplace Products</h2>
      
            <h3>Before Dispatch</h3>
            <p>Marketplace product orders can be cancelled within <strong>24 hours</strong> of placing the order, or at any time before dispatch (whichever is earlier).</p>
      
            <h3>After Dispatch</h3>
            <p>Once a product has been shipped, the order cannot be cancelled. The customer may return the product if it qualifies under the return policy below.</p>
      
            <h3>Custom or Made-to-Order Equipment</h3>
            <p>Orders for customized or fabricated kitchen equipment cannot be cancelled once the order is confirmed and production has started.</p>
      
            <h2>3. Return Policy</h2>
            <p>Returns are accepted only in the following situations:</p>
            <ul>
              <li>The product is damaged during transit.</li>
              <li>The wrong product is delivered.</li>
            </ul>
            <p>To initiate a return, the customer must inform KNI within <strong>48 hours of delivery</strong> with the following:</p>
            <ul>
              <li>Photos and videos of the damaged or wrong product as proof.</li>
              <li>Order details (Order ID, date of delivery).</li>
            </ul>
            <p>The product must be returned unused, in original packaging, with all accessories and labels intact.</p>
      
            <h2>4. Non-Returnable Items</h2>
            <p>The following items cannot be returned once delivered:</p>
            <ul>
              <li>Installed equipment.</li>
              <li>Used or damaged products (after delivery, where damage is caused by the customer).</li>
              <li>Custom-built or fabricated kitchen equipment.</li>
              <li>Perishable or consumable items.</li>
            </ul>
      
            <h2>5. Shipping &amp; Delivery</h2>
            <ul>
              <li>Delivery timelines provided are estimates only and may vary.</li>
              <li>KNI is not liable for delays caused by third-party courier partners or unforeseen circumstances.</li>
            </ul>
      
            <h2>6. How to Cancel an Order or Service</h2>
            <p>To cancel an order or service booking, please contact our support team within the eligible time window:</p>
            <ul>
              <li>Provide the order ID or service booking ID.</li>
              <li>Provide the reason for cancellation.</li>
              <li>Cancellations must be requested in writing via email.</li>
            </ul>
            <p>Once the cancellation is approved, refunds will be processed as per our <a href="/refund-policy" style={{color: '#E71720', fontWeight: '600'}}>Refund Policy</a> within 7 to 10 working days.</p>
      
            <h2>7. Contact Us</h2>
            <p>For any cancellation requests or questions about this policy, please contact us at:</p>
            <div className="contact-box">
              <p><strong>Kitchen Network International Services Pvt. Ltd.</strong></p>
              <p>Email: <a href="mailto:info@kniservices.com">info@kniservices.com</a></p>
              <p>Phone: <a href="tel:+918001700002">+91 80017 00002</a></p>
            </div>
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
