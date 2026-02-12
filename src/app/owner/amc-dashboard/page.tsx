"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import {
  Shield,
  Loader2,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  ArrowRight,
  Plus,
  Activity,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface UpcomingVisit {
  status: string;
  scheduledDate: string;
  restaurant: string;
  contractId: string;
}

interface DashboardData {
  activeContracts: number;
  totalContracts: number;
  totalVisits: number;
  completedVisits: number;
  pendingRequests: number;
  activeBreakdowns: number;
  upcomingVisits: UpcomingVisit[];
}

export default function OwnerAMCDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/owner/amc-dashboard")
      .then((r) => r.json())
      .then((d) => d.ok && setData(d.data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const pendingVisits = data.totalVisits - data.completedVisits;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            AMC Dashboard
          </h1>
          <p className="text-muted-foreground">Your Annual Maintenance Contract overview</p>
        </div>
        <Button onClick={() => router.push("/owner/amc-request")}>
          <Plus className="mr-2 h-4 w-4" />
          New AMC Request
        </Button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Active Contracts"
          value={data.activeContracts}
          icon={CheckCircle}
          description={`${data.totalContracts} total`}
        />
        <StatCard
          title="Pending Requests"
          value={data.pendingRequests}
          icon={Clock}
          description="In progress"
        />
        <StatCard
          title="Visits Done"
          value={data.completedVisits}
          icon={Calendar}
          description={`${data.totalVisits} total scheduled`}
        />
        <StatCard
          title="Active Breakdowns"
          value={data.activeBreakdowns}
          icon={AlertTriangle}
          description={data.activeBreakdowns > 0 ? "Needs attention" : "All clear"}
          className={data.activeBreakdowns > 0 ? "border-red-200" : ""}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contract Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Contract Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.totalContracts === 0 ? (
              <div className="text-center py-6">
                <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No AMC contracts yet</p>
                <Button variant="outline" className="mt-3" onClick={() => router.push("/owner/amc-request")}>
                  Request AMC
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Active Contracts</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">{data.activeContracts}</span>
                </div>

                {/* Visit progress */}
                {data.totalVisits > 0 && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Preventive Visits</span>
                      <span className="font-medium">{data.completedVisits}/{data.totalVisits}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-green-500 h-2.5 rounded-full transition-all"
                        style={{ width: `${(data.completedVisits / data.totalVisits) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {pendingVisits} visit{pendingVisits !== 1 ? "s" : ""} remaining
                    </p>
                  </div>
                )}

                {data.activeBreakdowns > 0 && (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium text-red-700">
                        {data.activeBreakdowns} breakdown{data.activeBreakdowns > 1 ? "s" : ""} being handled
                      </span>
                    </div>
                  </div>
                )}

                {data.pendingRequests > 0 && (
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-700">
                        {data.pendingRequests} request{data.pendingRequests > 1 ? "s" : ""} in progress
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Visits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Visits
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingVisits.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No upcoming visits scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.upcomingVisits.map((visit, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition">
                    <div>
                      <p className="font-medium text-sm">{visit.restaurant}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(visit.scheduledDate)}
                      </p>
                    </div>
                    <Badge variant={visit.status === "ASSIGNED" ? "default" : "warning"}>
                      {visit.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => router.push("/owner/amc-request")}>
              <Plus className="h-5 w-5" />
              <span className="text-xs">New AMC Request</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => router.push("/owner/amc-requests")}>
              <FileText className="h-5 w-5" />
              <span className="text-xs">My Requests</span>
              {data.pendingRequests > 0 && <Badge variant="warning" className="text-[10px]">{data.pendingRequests} active</Badge>}
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => router.push("/owner/amc-contracts")}>
              <Shield className="h-5 w-5" />
              <span className="text-xs">My Contracts</span>
              {data.activeContracts > 0 && <Badge variant="success" className="text-[10px]">{data.activeContracts} active</Badge>}
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => router.push("/owner/amc-contracts")}>
              <AlertTriangle className="h-5 w-5" />
              <span className="text-xs">Report Breakdown</span>
              {data.activeBreakdowns > 0 && <Badge variant="destructive" className="text-[10px]">{data.activeBreakdowns}</Badge>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
