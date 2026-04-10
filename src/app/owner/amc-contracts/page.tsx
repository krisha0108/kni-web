"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useRestaurant } from "@/contexts/restaurant-context";
import { Shield, Loader2, Calendar, Building2, ArrowRight } from "lucide-react";
import { formatDate, formatPrice } from "@/lib/utils";

const statusColors: Record<string, "default" | "success" | "destructive" | "warning"> = {
  ACTIVE: "success",
  EXPIRED: "destructive",
  CANCELLED: "destructive",
  RENEWED: "default",
};

export default function OwnerAMCContractsPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();
  const router = useRouter();
  const { selectedRestaurant } = useRestaurant();

  useEffect(() => {
    if (!selectedRestaurant) return;
    setIsLoading(true);
    fetch(`/api/owner/amc-contracts?restaurantId=${selectedRestaurant.restaurantId}&page=${page}&pageSize=20`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          const items = d.data?.items || d.data;
          const total = d.data?.total || 0;
          setContracts(Array.isArray(items) ? items : []);
          setTotalPages(Math.ceil(total / 20) || 1);
        }
      })
      .catch(() => toast({ title: "Error", description: "Failed to load contracts", variant: "destructive" }))
      .finally(() => setIsLoading(false));
  }, [selectedRestaurant, page]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          AMC Contracts
        </h1>
        <p className="text-muted-foreground">Your active Annual Maintenance Contracts</p>
      </div>

      {contracts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">No active contracts</p>
            <p className="text-sm text-muted-foreground">Contracts are created when you accept an AMC proposal</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {contracts.map((contract) => {
            const completedVisits = contract.scheduledVisits.filter((v: any) => v.status === "COMPLETED").length;
            const totalVisits = contract.scheduledVisits.length;
            const nextVisit = contract.scheduledVisits.find((v: any) => v.status === "SCHEDULED" || v.status === "ASSIGNED");

            return (
              <Card key={contract.id} className="hover:shadow-md transition">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-lg">{contract.restaurant.name}</p>
                        <Badge variant={statusColors[contract.status]}>{contract.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground font-mono">{contract.contractNumber}</p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <span><Calendar className="h-3 w-3 inline mr-1" />{formatDate(contract.startDate)} - {formatDate(contract.endDate)}</span>
                        <span>{formatPrice(contract.amountPerCycle)} / {contract.billingCycle.toLowerCase()}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Visits: {completedVisits}/{totalVisits}</p>
                        <div className="w-32 h-2 bg-muted rounded-full mt-1">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${totalVisits > 0 ? (completedVisits / totalVisits) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      {nextVisit && (
                        <p className="text-xs text-muted-foreground">
                          Next visit: {formatDate(nextVisit.scheduledDate)}
                        </p>
                      )}
                      <Button size="sm" variant="outline" onClick={() => router.push(`/owner/amc-contracts/${contract.id}`)}>
                        View Details <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4 p-4">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
          <span className="flex items-center px-4 text-sm">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
        </div>
      )}
    </div>
  );
}