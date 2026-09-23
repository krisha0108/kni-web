"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Trash2, Mail, MailOpen, Phone } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string | null;
  message: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function AdminContactInquiriesPage() {
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const fetchInquiries = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/contact-inquiries");
      const data = await response.json();
      if (data.ok) setInquiries(data.data);
    } catch {
      toast({ title: "Error", description: "Failed to fetch contact inquiries", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const toggleRead = async (id: string, current: boolean) => {
    setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, isRead: !current } : i)));
    try {
      const response = await fetch(`/api/admin/contact-inquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: !current }),
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error);
    } catch {
      setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, isRead: current } : i)));
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/contact-inquiries/${deleteTarget.id}`, { method: "DELETE" });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Deleted", description: "Contact inquiry deleted" });
        setDeleteTarget(null);
        fetchInquiries();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = inquiries.filter((i) => {
    const q = search.toLowerCase();
    return !q || i.name.toLowerCase().includes(q) || i.email.toLowerCase().includes(q) || i.phone.includes(q);
  });

  const unreadCount = inquiries.filter((i) => !i.isRead).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Contact Inquiries</h1>
        <p className="text-muted-foreground">
          Submissions from the landing page &quot;Contact Us&quot; form
          {unreadCount > 0 && <span className="ml-2 font-medium text-foreground">· {unreadCount} unread</span>}
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search name, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden sm:table-cell">Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Subject / Message</TableHead>
                <TableHead className="hidden md:table-cell">Received</TableHead>
                <TableHead className="w-[60px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No contact inquiries yet</TableCell></TableRow>
              ) : (
                filtered.map((i) => (
                  <TableRow key={i.id} className={!i.isRead ? "bg-blue-50/50" : ""}>
                    <TableCell>
                      <button onClick={() => toggleRead(i.id, i.isRead)} title={i.isRead ? "Mark unread" : "Mark read"}>
                        {i.isRead ? <MailOpen className="h-4 w-4 text-muted-foreground" /> : <Mail className="h-4 w-4 text-blue-600" />}
                      </button>
                    </TableCell>
                    <TableCell className="font-medium text-xs sm:text-sm">
                      {i.name}
                      {!i.isRead && <Badge variant="secondary" className="ml-2 text-xs">New</Badge>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs sm:text-sm break-all">
                      <a href={`mailto:${i.email}`} className="text-blue-600 hover:underline">{i.email}</a>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs sm:text-sm">
                      <a href={`tel:${i.phone}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                        <Phone className="h-3 w-3" /> {i.phone}
                      </a>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs sm:text-sm max-w-[300px]">
                      {i.subject && <p className="font-medium truncate">{i.subject}</p>}
                      {i.message && <p className="text-muted-foreground truncate">{i.message}</p>}
                      {!i.subject && !i.message && <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs sm:text-sm">{formatDateTime(i.createdAt)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteTarget({ id: i.id, name: i.name })} className="h-8 w-8 p-0">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
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
            <AlertDialogTitle>Delete Contact Inquiry?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the submission from <strong>{deleteTarget?.name}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
