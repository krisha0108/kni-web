"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function VendorPaymentsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/vendor/orders");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-48">
      <p className="text-muted-foreground">Redirecting to Order Management...</p>
    </div>
  );
}
