"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useRestaurant } from "@/contexts/restaurant-context";
import { formatPrice, formatDate } from "@/lib/utils";
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Filter,
  Pencil,
  Trash2,
  Calendar,
  DollarSign,
} from "lucide-react";

interface CashbookEntry {
  id: string;
  entryType: "CASH_IN" | "CASH_OUT" | "BANK_IN" | "BANK_OUT";
  amount: number;
  paymentMode: string;
  category: string | null;
  description: string;
  referenceNo: string | null;
  entryDate: string;
  createdAt: string;
  creator: {
    id: string;
    name: string;
  };
}

interface CashbookStats {
  cashIn: number;
  cashOut: number;
  cashBalance: number;
  bankIn: number;
  bankOut: number;
  bankBalance: number;
  totalBalance: number;
  totalEntries: number;
}

const ENTRY_TYPES = [
  { value: "CASH_IN", label: "Cash In", icon: ArrowUpRight, color: "text-green-600" },
  { value: "CASH_OUT", label: "Cash Out", icon: ArrowDownRight, color: "text-red-600" },
  { value: "BANK_IN", label: "Bank In", icon: ArrowUpRight, color: "text-green-600" },
  { value: "BANK_OUT", label: "Bank Out", icon: ArrowDownRight, color: "text-red-600" },
];

const PAYMENT_MODES = ["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "CARD", "OTHER"];

const EXPENSE_CATEGORIES = [
  "Groceries",
  "Utilities",
  "Rent",
  "Salaries",
  "Equipment Maintenance",
  "Marketing",
  "Transportation",
  "Other",
];

export default function CashbookPage() {
  const [entries, setEntries] = useState<CashbookEntry[]>([]);
  const [stats, setStats] = useState<CashbookStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CashbookEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<CashbookEntry | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const { selectedRestaurant } = useRestaurant();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    entryType: "CASH_IN" as "CASH_IN" | "CASH_OUT" | "BANK_IN" | "BANK_OUT",
    amount: "",
    paymentMode: "CASH",
    category: "",
    description: "",
    referenceNo: "",
    entryDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (selectedRestaurant) {
      fetchEntries();
      fetchStats();
    }
  }, [selectedRestaurant, filterType]);

  const fetchEntries = async () => {
    if (!selectedRestaurant) return;

    try {
      setIsLoading(true);
      let url = `/api/owner/cashbook?restaurantId=${selectedRestaurant.restaurantId}`;
      if (filterType !== "all") {
        url += `&entryType=${filterType}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.ok) {
        setEntries(data.data);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch entries",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch entries",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!selectedRestaurant) return;

    try {
      const response = await fetch(
        `/api/owner/cashbook/stats?restaurantId=${selectedRestaurant.restaurantId}`
      );
      const data = await response.json();

      if (data.ok) {
        setStats(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const openCreateDialog = (entryType?: "CASH_IN" | "CASH_OUT" | "BANK_IN" | "BANK_OUT") => {
    setEditingEntry(null);
    setFormData({
      entryType: entryType || "CASH_IN",
      amount: "",
      paymentMode: "CASH",
      category: "",
      description: "",
      referenceNo: "",
      entryDate: new Date().toISOString().split("T")[0],
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (entry: CashbookEntry) => {
    setEditingEntry(entry);
    setFormData({
      entryType: entry.entryType,
      amount: (entry.amount / 100).toString(),
      paymentMode: entry.paymentMode,
      category: entry.category || "",
      description: entry.description,
      referenceNo: entry.referenceNo || "",
      entryDate: new Date(entry.entryDate).toISOString().split("T")[0],
    });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (entry: CashbookEntry) => {
    setDeletingEntry(entry);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRestaurant || !formData.amount || !formData.description) {
      toast({
        title: "Validation Error",
        description: "Amount and description are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const url = editingEntry
        ? `/api/owner/cashbook/${editingEntry.id}`
        : "/api/owner/cashbook";

      const method = editingEntry ? "PATCH" : "POST";

      const payload: any = {
        entryType: formData.entryType,
        amount: parseFloat(formData.amount),
        paymentMode: formData.paymentMode,
        description: formData.description,
        entryDate: formData.entryDate,
      };

      if (!editingEntry) {
        payload.restaurantId = selectedRestaurant.restaurantId;
      }

      if (formData.category) payload.category = formData.category;
      if (formData.referenceNo) payload.referenceNo = formData.referenceNo;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: editingEntry ? "Entry updated successfully" : "Entry added successfully",
        });
        fetchEntries();
        fetchStats();
        setIsDialogOpen(false);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to save entry",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save entry",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingEntry) return;

    try {
      const response = await fetch(`/api/owner/cashbook/${deletingEntry.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: "Entry deleted successfully",
        });
        fetchEntries();
        fetchStats();
        setIsDeleteDialogOpen(false);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete entry",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete entry",
        variant: "destructive",
      });
    }
  };

  const getEntryTypeConfig = (type: string) => {
    return ENTRY_TYPES.find((t) => t.value === type) || ENTRY_TYPES[0];
  };

  if (!selectedRestaurant) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Please select a restaurant</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Daily Cashbook</h1>
          <p className="text-muted-foreground">
            Track cash and bank transactions for {selectedRestaurant.restaurant.name}
          </p>
        </div>
        <Button onClick={() => openCreateDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Entry
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Cash Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(stats.cashBalance)}</div>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span className="text-green-600">In: {formatPrice(stats.cashIn)}</span>
                <span className="text-red-600">Out: {formatPrice(stats.cashOut)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Bank Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(stats.bankBalance)}</div>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span className="text-green-600">In: {formatPrice(stats.bankIn)}</span>
                <span className="text-red-600">Out: {formatPrice(stats.bankOut)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  stats.totalBalance >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatPrice(stats.totalBalance)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats.totalEntries} entries recorded
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Add common transactions quickly</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            {ENTRY_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <Button
                  key={type.value}
                  variant="outline"
                  className="h-auto py-4 flex-col"
                  onClick={() =>
                    openCreateDialog(type.value as "CASH_IN" | "CASH_OUT" | "BANK_IN" | "BANK_OUT")
                  }
                >
                  <Icon className={`h-5 w-5 mb-2 ${type.color}`} />
                  <span className="font-medium">{type.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entries</SelectItem>
              <SelectItem value="CASH_IN">Cash In</SelectItem>
              <SelectItem value="CASH_OUT">Cash Out</SelectItem>
              <SelectItem value="BANK_IN">Bank In</SelectItem>
              <SelectItem value="BANK_OUT">Bank Out</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Entries List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading entries...</p>
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No entries found</p>
            <Button onClick={() => openCreateDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Entry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {entries.map((entry) => {
            const config = getEntryTypeConfig(entry.entryType);
            const Icon = config.icon;
            return (
              <Card key={entry.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Icon className={`h-5 w-5 ${config.color}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{entry.description}</span>
                            <Badge variant="outline">{config.label}</Badge>
                            {entry.category && (
                              <Badge variant="secondary" className="text-xs">
                                {entry.category}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(entry.entryDate)}
                            </span>
                            <span>{entry.paymentMode}</span>
                            {entry.referenceNo && <span>Ref: {entry.referenceNo}</span>}
                            {entry.creator?.name && <span>By: {entry.creator.name}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className={`text-lg font-bold ${
                          entry.entryType.includes("IN") ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {entry.entryType.includes("IN") ? "+" : "-"}
                        {formatPrice(entry.amount)}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(entry)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDeleteDialog(entry)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Entry Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? "Edit Entry" : "Add New Entry"}
            </DialogTitle>
            <DialogDescription>
              {editingEntry ? "Update the cashbook entry" : "Record a new cash or bank transaction"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entryType">
                  Entry Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.entryType}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, entryType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTRY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount (₹) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="1000.00"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentMode">Payment Mode</Label>
                <Select
                  value={formData.paymentMode}
                  onValueChange={(value) => setFormData({ ...formData, paymentMode: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Monthly electricity bill"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="referenceNo">Reference Number</Label>
                <Input
                  id="referenceNo"
                  value={formData.referenceNo}
                  onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                  placeholder="Optional reference number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="entryDate">
                  Entry Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="entryDate"
                  type="date"
                  value={formData.entryDate}
                  onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : editingEntry ? "Update" : "Add Entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this cashbook entry. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
