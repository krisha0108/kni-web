"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminStorePaymentsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/my-store/orders");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-48">
      <p className="text-muted-foreground">Redirecting to Order Management...</p>
    </div>
  );
}
