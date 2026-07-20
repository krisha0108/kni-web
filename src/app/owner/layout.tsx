import { redirect } from "next/navigation";
import Script from "next/script";
import { getSession } from "@/server/auth/session";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { ownerSidebarItems } from "@/components/layouts/sidebar";
import { RestaurantProvider } from "@/contexts/restaurant-context";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "OWNER") {
    redirect("/login");
  }

  return (
    <RestaurantProvider>
      {/* Owner pages that take payments (bookings, marketplace, AMC) need this -
          loaded here instead of the root layout so pages outside /owner (blog,
          policy pages, landing) don't pay for a script they never use. */}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <DashboardLayout
        sidebarItems={ownerSidebarItems}
        sidebarTitle="KNI Owner"
        user={{
          name: session.name,
          email: session.email,
          role: session.role,
        }}
      >
        {children}
      </DashboardLayout>
    </RestaurantProvider>
  );
}