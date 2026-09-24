"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Eye, Trash2, Loader2, Building2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface CompanyRow {
  id: string;
  name: string;
  city: string | null;
  gstNumber: string | null;
  createdAt: string;
  createdBySalesman: { id: string; name: string } | null;
  contacts: { name: string; phone: string | null; email: string | null }[];
  _count: { contacts: number; inquiries: number; visits: number };
}

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/companies");
      const data = await response.json();
      if (data.ok) setCompanies(data.data);
    } catch {
      toast({ title: "Error", description: "Failed to fetch companies", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const filtered = companies.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || (c.city || "").toLowerCase().includes(q);
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/companies/${deleteTarget.id}`, { method: "DELETE" });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Deleted", description: data.message });
        setDeleteTarget(null);
        fetchCompanies();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete company", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Companies</h1>
          <p className="text-muted-foreground">Master list of companies collected by salesmen and admin</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search company, city..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="px-2 sm:px-4">Company</TableHead>
                <TableHead className="hidden sm:table-cell px-2 sm:px-4">Primary Contact</TableHead>
                <TableHead className="hidden md:table-cell px-2 sm:px-4">City</TableHead>
                <TableHead className="px-2 sm:px-4">Inquiries</TableHead>
                <TableHead className="px-2 sm:px-4">Visits</TableHead>
                <TableHead className="hidden md:table-cell px-2 sm:px-4">Added</TableHead>
                <TableHead className="px-2 sm:px-4 w-[60px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No companies yet
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/admin/companies/${c.id}`)}
                  >
                    <TableCell className="font-medium px-2 sm:px-4 text-xs sm:text-sm break-words">{c.name}</TableCell>
                    <TableCell className="hidden sm:table-cell px-2 sm:px-4 text-xs sm:text-sm">
                      {c.contacts[0]?.name || "-"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell px-2 sm:px-4 text-xs sm:text-sm">{c.city || "-"}</TableCell>
                    <TableCell className="px-2 sm:px-4 text-xs sm:text-sm">{c._count.inquiries}</TableCell>
                    <TableCell className="px-2 sm:px-4 text-xs sm:text-sm">{c._count.visits}</TableCell>
                    <TableCell className="hidden md:table-cell px-2 sm:px-4 text-xs sm:text-sm">{formatDate(c.createdAt)}</TableCell>
                    <TableCell className="px-2 sm:px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => router.push(`/admin/companies/${c.id}`)} className="h-8 w-8 p-0">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteTarget({ id: c.id, name: c.name })} className="h-8 w-8 p-0">
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? Linked inquiries and visits are kept, just unlinked from this company record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>) : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
