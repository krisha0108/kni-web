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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Plus, Pencil, Trash2, Loader2, Eye } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Salesman {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  salesmanProfile: { region: string | null } | null;
  _count: { assignedInquiries: number; salesmanVisits: number };
}

export default function AdminSalesmenPage() {
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const fetchSalesmen = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/salesmen");
      const data = await response.json();
      if (data.ok) {
        setSalesmen(Array.isArray(data.data) ? data.data : []);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch salesmen", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesmen();
  }, []);

  const filtered = salesmen.filter((s) => {
    const q = search.toLowerCase();
    return !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });

  const handleDeleteSalesman = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/salesmen/${deleteTarget.id}`, { method: "DELETE" });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Deleted", description: data.message });
        setDeleteTarget(null);
        fetchSalesmen();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete salesman", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleStatus = async (salesmanId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/salesmen/${salesmanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Success",
          description: `Salesman ${!currentStatus ? "activated" : "deactivated"}`,
        });
        fetchSalesmen();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update salesman status", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Salesmen</h1>
          <p className="text-muted-foreground">Manage salesman accounts and their sales activity</p>
        </div>
        <Button onClick={() => router.push("/admin/salesmen/create")}>
          <Plus className="mr-2 h-4 w-4" />
          Create Salesman
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search salesmen..."
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
                <TableHead className="px-2 sm:px-4 hidden md:table-cell">Inquiries</TableHead>
                <TableHead className="px-2 sm:px-4 hidden md:table-cell">Visits</TableHead>
                <TableHead className="px-2 sm:px-4 hidden md:table-cell">Registered</TableHead>
                <TableHead className="px-2 sm:px-4 w-[100px] sm:w-[160px]">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No salesmen found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((salesman) => (
                  <TableRow key={salesman.id}>
                    <TableCell className="font-medium px-2 sm:px-4 text-xs sm:text-sm break-words">
                      {salesman.name}
                    </TableCell>
                    <TableCell className="hidden md:table-cell px-2 sm:px-4 text-xs sm:text-sm break-words">
                      {salesman.email}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell px-2 sm:px-4 text-xs sm:text-sm break-words">
                      {salesman.phone || "-"}
                    </TableCell>
                    <TableCell className="px-2 sm:px-4">
                      <Badge variant={salesman.isActive ? "success" : "secondary"} className="text-xs whitespace-nowrap">
                        {salesman.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell px-2 sm:px-4 text-xs sm:text-sm">
                      {salesman._count.assignedInquiries}
                    </TableCell>
                    <TableCell className="hidden md:table-cell px-2 sm:px-4 text-xs sm:text-sm">
                      {salesman._count.salesmanVisits}
                    </TableCell>
                    <TableCell className="hidden md:table-cell px-2 sm:px-4 text-xs sm:text-sm">
                      {formatDate(salesman.createdAt)}
                    </TableCell>
                    <TableCell className="px-2 sm:px-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/admin/salesmen/${salesman.id}`)}
                          className="text-xs sm:text-sm h-8"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/admin/salesmen/${salesman.id}/edit`)}
                          className="text-xs sm:text-sm h-8"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant={salesman.isActive ? "destructive" : "default"}
                          onClick={() => toggleStatus(salesman.id, salesman.isActive)}
                          className="text-xs sm:text-sm h-8"
                        >
                          {salesman.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTarget({ id: salesman.id, name: salesman.name })}
                          title="Delete permanently"
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Delete Salesman Permanently?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?</p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  <p className="font-semibold mb-1">This action cannot be undone. The following data will be permanently deleted:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>All visit logs recorded by this salesman</li>
                    <li>Their assignment on any inquiries (inquiries themselves are kept, just unassigned)</li>
                    <li>All notifications and sessions</li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSalesman}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
              ) : (
                <><Trash2 className="mr-2 h-4 w-4" /> Delete Permanently</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
