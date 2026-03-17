"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Pencil } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Engineer {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  engineerProfile: {
    payoutMethod: string;
    commissionRate: number;
    monthlySalary: number | null;
  } | null;
}

export default function AdminEngineersPage() {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  const fetchEngineers = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);

      const response = await fetch("/api/admin/engineers?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        setEngineers(data.data.items || data.data);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch engineers", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEngineers();
  }, [search]);

  const toggleStatus = async (engineerId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/engineers/${engineerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Success",
          description: `Engineer ${!currentStatus ? "activated" : "deactivated"}`
        });
        fetchEngineers();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update engineer status", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Engineers</h1>
          <p className="text-muted-foreground">Manage engineer accounts</p>
        </div>
        <Button onClick={() => router.push("/admin/engineers/create")}>
          <Plus className="mr-2 h-4 w-4" />
          Create Engineer
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search engineers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="px-2 sm:px-4">Name</TableHead>
                <TableHead className="px-2 sm:px-4 hidden md:table-cell">Email</TableHead>
                <TableHead className="px-2 sm:px-4 hidden sm:table-cell">Phone</TableHead>
                <TableHead className="px-2 sm:px-4">Status</TableHead>
                <TableHead className="px-2 sm:px-4 hidden md:table-cell">Payout</TableHead>
                <TableHead className="px-2 sm:px-4 hidden md:table-cell">Registered</TableHead>
                <TableHead className="px-2 sm:px-4 w-[100px] sm:w-[160px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : engineers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No engineers found
                  </TableCell>
                </TableRow>
              ) : (
                engineers.map((engineer) => (
                  <TableRow key={engineer.id}>
                    <TableCell className="font-medium px-2 sm:px-4 text-xs sm:text-sm break-words">
                      {engineer.name}
                    </TableCell>
                    <TableCell className="hidden md:table-cell px-2 sm:px-4 text-xs sm:text-sm break-words">
                      {engineer.email}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell px-2 sm:px-4 text-xs sm:text-sm break-words">
                      {engineer.phone}
                    </TableCell>
                    <TableCell className="px-2 sm:px-4">
                      <Badge variant={engineer.isActive ? "success" : "secondary"} className="text-xs whitespace-nowrap">
                        {engineer.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell px-2 sm:px-4">
                      {engineer.engineerProfile?.payoutMethod === "SALARY" ? (
                        <Badge variant="outline" className="text-xs whitespace-nowrap">Salary ₹{(engineer.engineerProfile.monthlySalary || 0).toLocaleString('en-IN')}/mo</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs whitespace-nowrap">Commission {engineer.engineerProfile?.commissionRate || 20}%</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell px-2 sm:px-4 text-xs sm:text-sm">
                      {formatDate(engineer.createdAt)}
                    </TableCell>
                    <TableCell className="px-2 sm:px-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/admin/engineers/${engineer.id}/edit`)}
                          className="text-xs sm:text-sm h-8"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant={engineer.isActive ? "destructive" : "default"}
                          onClick={() => toggleStatus(engineer.id, engineer.isActive)}
                          className="text-xs sm:text-sm h-8"
                        >
                          {engineer.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}