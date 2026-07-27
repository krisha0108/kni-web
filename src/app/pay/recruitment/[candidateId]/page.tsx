"use client";

import { useEffect, useState, use as usePromise } from "react";
import Script from "next/script";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, IndianRupee } from "lucide-react";

interface OrderInfo {
  orderId: string;
  amount: number;
  keyId: string;
  candidateName: string;
  email: string;
  engagementType: "COMMISSION" | "SALARY" | null;
  finalCommissionRate: number | null;
  finalMonthlySalary: number | null;
}

export default function RecruitmentPaymentPage({
  params,
}: {
  params: Promise<{ candidateId: string }>;
}) {
  const { candidateId } = usePromise(params);
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    fetch(`/api/public/recruitment-payment/${candidateId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setOrder(data.data);
        else setError(data.error || "Unable to load payment details");
      })
      .catch(() => setError("Unable to load payment details"))
      .finally(() => setLoading(false));
  }, [candidateId]);

  function startPayment() {
    if (!order || !scriptReady) return;
    setPaying(true);
    const RazorpayCheckout = (window as unknown as { Razorpay: new (options: Record<string, unknown>) => { open: () => void } }).Razorpay;
    const rzp = new RazorpayCheckout({
      key: order.keyId,
      amount: order.amount * 100,
      currency: "INR",
      name: "KNI Services",
      description: "Technician Registration Fee",
      order_id: order.orderId,
      prefill: { name: order.candidateName, email: order.email },
      theme: { color: "#EF3A3A" },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        try {
          const res = await fetch("/api/public/recruitment-payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const data = await res.json();
          if (data.ok) {
            setDone(data.data.registrationId);
          } else {
            setError(data.error || "Payment verification failed");
          }
        } catch {
          setError("Payment verification failed");
        } finally {
          setPaying(false);
        }
      },
      modal: { ondismiss: () => setPaying(false) },
    });
    rzp.open();
  }

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setScriptReady(true)} />
      <div className="mx-auto max-w-md">
        <div className="mb-6 rounded-lg bg-[#EF3A3A] px-6 py-5 text-center text-white">
          <h1 className="text-lg font-bold">KNI Services — Registration Fee</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Complete Your Registration</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : done ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
                <p className="font-semibold">Payment Successful!</p>
                <p className="text-sm text-muted-foreground">
                  Your registration ID is <span className="font-mono font-medium">{done}</span>. Login
                  details have been sent to your email.
                </p>
              </div>
            ) : error ? (
              <p className="py-6 text-center text-sm text-red-600">{error}</p>
            ) : order ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Candidate: {order.candidateName}</p>
                {(order.engagementType === "SALARY" && order.finalMonthlySalary) ||
                (order.engagementType === "COMMISSION" && order.finalCommissionRate != null) ? (
                  <div className="rounded-md border border-green-200 bg-green-50 p-3 text-center">
                    <p className="text-xs font-medium text-green-800">
                      Your Confirmed {order.engagementType === "SALARY" ? "Salary" : "Commission"}
                    </p>
                    <p className="text-lg font-bold text-green-700">
                      {order.engagementType === "SALARY"
                        ? `₹${order.finalMonthlySalary?.toLocaleString("en-IN")} / month`
                        : `${order.finalCommissionRate}% per job`}
                    </p>
                    <p className="text-xs text-green-800">
                      {order.engagementType === "SALARY" ? "Full-Time Employee" : "Associate Service Partner"}
                    </p>
                  </div>
                ) : null}
                <div className="flex items-center justify-center gap-1 text-3xl font-bold">
                  <IndianRupee className="h-6 w-6" /> {order.amount.toLocaleString("en-IN")}
                </div>
                <p className="text-center text-xs text-muted-foreground">Registration Fee</p>
                <Button className="w-full" disabled={paying || !scriptReady} onClick={startPayment}>
                  {paying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Pay Now
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
