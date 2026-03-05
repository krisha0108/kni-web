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
  DollarSign,
  ArrowRight,
  Calendar,
  AlertCircle,
  TrendingUp,
  Activity,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface DashboardData {
  totalContracts: number;
  activeContracts: number;
  expiredContracts: number;
  pendingRequests: number;
  inSurvey: number;
  proposalsSent: number;
  monthlyRevenue: number;
  expiringContracts: number;
  totalVisits: number;
  completedVisits: number;
  pendingVisits: number;
  activeBreakdowns: number;
  highPriorityBreakdowns: number;
}

export default function AdminAMCDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/amc-dashboard")
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          AMC Dashboard
        </h1>
        <p className="text-muted-foreground">Overview of all AMC operations</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Active Contracts"
          value={data.activeContracts}
          icon={CheckCircle}
          description={`${data.totalContracts} total contracts`}
        />
        <StatCard
          title="Monthly Revenue"
          value={formatPrice(data.monthlyRevenue)}
          icon={DollarSign}
          description="Estimated from active contracts"
        />
        <StatCard
          title="Pending Requests"
          value={data.pendingRequests}
          icon={Clock}
          description="Awaiting action"
        />
        <StatCard
          title="Active Breakdowns"
          value={data.activeBreakdowns}
          icon={AlertTriangle}
          description={data.highPriorityBreakdowns > 0 ? `${data.highPriorityBreakdowns} high priority` : "No high priority"}
          className={data.highPriorityBreakdowns > 0 ? "border-red-200" : ""}
        />
      </div>

      {/* Pipeline & Visits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AMC Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              AMC Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <span className="font-medium">New Requests</span>
              </div>
              <Badge variant="warning">{data.pendingRequests}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="font-medium">In Survey</span>
              </div>
              <Badge variant="default">{data.inSurvey}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-purple-500" />
                <span className="font-medium">Proposals Sent</span>
              </div>
              <Badge variant="secondary">{data.proposalsSent}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="font-medium">Active Contracts</span>
              </div>
              <Badge variant="success">{data.activeContracts}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gray-400" />
                <span className="font-medium">Expired</span>
              </div>
              <Badge variant="secondary">{data.expiredContracts}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Visit Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Visit Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{data.totalVisits}</p>
                <p className="text-xs text-muted-foreground">Total Visits</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{data.completedVisits}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{data.pendingVisits}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>

            {/* Progress bar */}
            {data.totalVisits > 0 && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Visit Completion</span>
                  <span className="font-medium">{Math.round((data.completedVisits / data.totalVisits) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-500 h-3 rounded-full transition-all"
                    style={{ width: `${(data.completedVisits / data.totalVisits) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Breakdown alerts */}
            {data.activeBreakdowns > 0 && (
              <div className={`p-3 rounded-lg border ${data.highPriorityBreakdowns > 0 ? "bg-red-50 border-red-200" : "bg-orange-50 border-orange-200"}`}>
                <div className="flex items-center gap-2">
                  <AlertCircle className={`h-4 w-4 ${data.highPriorityBreakdowns > 0 ? "text-red-500" : "text-orange-500"}`} />
                  <span className="font-medium text-sm">
                    {data.activeBreakdowns} active breakdown{data.activeBreakdowns > 1 ? "s" : ""}
                    {data.highPriorityBreakdowns > 0 && (
                      <span className="text-red-600"> ({data.highPriorityBreakdowns} high priority)</span>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Expiring contracts warning */}
            {data.expiringContracts > 0 && (
              <div className="p-3 rounded-lg border bg-amber-50 border-amber-200">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-sm text-amber-800">
                    {data.expiringContracts} contract{data.expiringContracts > 1 ? "s" : ""} expiring in 30 days
                  </span>
                </div>
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
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => router.push("/admin/amc-requests")}>
              <FileText className="h-5 w-5" />
              <span className="text-xs">AMC Requests</span>
              {data.pendingRequests > 0 && <Badge variant="warning" className="text-[10px]">{data.pendingRequests} new</Badge>}
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => router.push("/admin/amc-visits")}>
              <Calendar className="h-5 w-5" />
              <span className="text-xs">Scheduled Visits</span>
              {data.pendingVisits > 0 && <Badge variant="default" className="text-[10px]">{data.pendingVisits} pending</Badge>}
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => router.push("/admin/amc-breakdowns")}>
              <AlertTriangle className="h-5 w-5" />
              <span className="text-xs">Breakdowns</span>
              {data.activeBreakdowns > 0 && <Badge variant="destructive" className="text-[10px]">{data.activeBreakdowns} active</Badge>}
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => router.push("/admin/amc-requests?status=PROPOSAL_SENT")}>
              <ArrowRight className="h-5 w-5" />
              <span className="text-xs">Pending Proposals</span>
              {data.proposalsSent > 0 && <Badge variant="secondary" className="text-[10px]">{data.proposalsSent} sent</Badge>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}