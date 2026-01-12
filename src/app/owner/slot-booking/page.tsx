"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OwnerSlotBookingPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new booking page
    router.replace("/owner/bookings/new");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Redirecting to booking page...</p>
      </div>
    </div>
  );
}
