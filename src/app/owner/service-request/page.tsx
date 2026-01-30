"use client";

// TODO: New Service Request feature is temporarily disabled
// This page will be enabled in a future release

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ServiceRequestPage() {
  const router = useRouter();

  return (
    <div className="p-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wrench className="h-6 w-6" />
          New Service Request
        </h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-16">
            <Wrench className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">Coming Soon</h3>
            <p className="text-muted-foreground text-center mt-2 max-w-md">
              The New Service Request feature is currently under development.
              Please go to My Equipment to request service for your equipment.
            </p>
            <Button className="mt-6" onClick={() => router.push("/owner/equipment")}>
              Go to My Equipment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
