"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientOnly } from "@/components/client-only";
import { useToast } from "@/hooks/use-toast";
import { Search, CheckCircle, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  vendorProfile: {
    approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
    subscriptionStatus: "TRIAL" | "ACTIVE" | "INACTIVE";
    approvalNote: string | null;
  } | null;
}

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  const fetchVendors = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);

      const response = await fetch("/api/admin/vendors?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        setVendors(data.data.items || data.data);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch vendors", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [search, statusFilter]);

  const handleApprove = async (vendorId: string) => {
    try {
      const response = await fetch(`/api/admin/vendors/${vendorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus: "APPROVED" }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Vendor approved" });
        fetchVendors();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to approve vendor", variant: "destructive" });
    }
  };

  const handleReject = async (vendorId: string) => {
    try {
      const response = await fetch(`/api/admin/vendors/${vendorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus: "REJECTED", approvalNote: "Rejected by admin" }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Vendor rejected" });
        fetchVendors();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to reject vendor", variant: "destructive" });
    }
  };

  const statusColors: Record<string, "default" | "secondary" | "success" | "destructive" | "warning"> = {
    PENDING: "warning",
    APPROVED: "success",
    REJECTED: "destructive",
  };

  const subscriptionColors: Record<string, "default" | "secondary" | "success" | "destructive" | "warning"> = {
    TRIAL: "secondary",
    ACTIVE: "success",
    INACTIVE: "destructive",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Vendors</h1>
        <p className="text-muted-foreground">Manage vendor accounts and approvals</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <ClientOnly>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </ClientOnly>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Approval Status</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : vendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No vendors found
                </TableCell>
              </TableRow>
            ) : (
              vendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">{vendor.name}</TableCell>
                  <TableCell>{vendor.email}</TableCell>
                  <TableCell>{vendor.phone}</TableCell>
                  <TableCell>
                    <Badge variant={statusColors[vendor.vendorProfile?.approvalStatus || "PENDING"] || "default"}>
                      {vendor.vendorProfile?.approvalStatus || "PENDING"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={subscriptionColors[vendor.vendorProfile?.subscriptionStatus || "INACTIVE"] || "default"}>
                      {vendor.vendorProfile?.subscriptionStatus || "INACTIVE"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(vendor.createdAt)}</TableCell>
                  <TableCell>
                    {vendor.vendorProfile?.approvalStatus === "PENDING" && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleApprove(vendor.id)}
                        >
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReject(vendor.id)}
                        >
                          <XCircle className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
