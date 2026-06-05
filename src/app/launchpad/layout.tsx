import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kniservices.com";

export const metadata: Metadata = {
  title: "Launch Pad - Start Your Restaurant with KNI",
  description:
    "Start your restaurant with KNI Launch Pad — end-to-end support for commercial kitchen setup, equipment, layout design and operations in India.",
  alternates: { canonical: `${SITE_URL}/launchpad` },
};

export default function LaunchpadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
