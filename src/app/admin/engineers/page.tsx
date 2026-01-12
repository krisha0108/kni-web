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
import { Search, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Engineer {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Engineers</h1>
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

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : engineers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No engineers found
                </TableCell>
              </TableRow>
            ) : (
              engineers.map((engineer) => (
                <TableRow key={engineer.id}>
                  <TableCell className="font-medium">{engineer.name}</TableCell>
                  <TableCell>{engineer.email}</TableCell>
                  <TableCell>{engineer.phone}</TableCell>
                  <TableCell>
                    <Badge variant={engineer.isActive ? "success" : "secondary"}>
                      {engineer.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(engineer.createdAt)}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant={engineer.isActive ? "destructive" : "default"}
                      onClick={() => toggleStatus(engineer.id, engineer.isActive)}
                    >
                      {engineer.isActive ? "Deactivate" : "Activate"}
                    </Button>
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
