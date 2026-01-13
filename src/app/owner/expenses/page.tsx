"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ClientOnly } from "@/components/client-only";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Calendar, Download, BarChart3, Building2 } from "lucide-react";
import { getAllExpenseCategories, getExpenseCategoryLabel } from "@/lib/expense";
import { formatPrice, formatDate } from "@/lib/utils";
import { useRestaurant } from "@/contexts/restaurant-context";

interface Expense {
  id: string;
  category: string;
  amount: number;
  expenseDate: string;
  description: string;
  receiptImageUrl: string | null;
  restaurant: {
    id: string;
    name: string;
  };
}

interface Restaurant {
  id: string;
  name: string;
}

export default function OwnerExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { selectedRestaurant } = useRestaurant();
  const { toast } = useToast();
  const router = useRouter();

  const [formData, setFormData] = useState({
    restaurantId: "",
    category: "FOOD" as const,
    amount: "",
    expenseDate: "",
    description: "",
    receiptImageUrl: "",
  });

  useEffect(() => {
    if (selectedRestaurant) {
      fetchExpenses();
    }
  }, [selectedRestaurant, categoryFilter, startDate, endDate]);

  // Update formData.restaurantId when selectedRestaurant changes
  useEffect(() => {
    if (selectedRestaurant) {
      setFormData(prev => ({ ...prev, restaurantId: selectedRestaurant.restaurantId }));
    }
  }, [selectedRestaurant]);

  const fetchExpenses = async () => {
    if (!selectedRestaurant) return;

    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append("restaurantId", selectedRestaurant.restaurantId);
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      if (startDate) params.append("startDate", new Date(startDate).toISOString());
      if (endDate) params.append("endDate", new Date(endDate).toISOString());

      const response = await fetch("/api/owner/expenses?" + params.toString());
      const data = await response.json();
      if (data.ok) {
        setExpenses(data.data.expenses || []);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch expenses",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch expenses",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      restaurantId: selectedRestaurant?.restaurantId || "",
      category: "FOOD",
      amount: "",
      expenseDate: "",
      description: "",
      receiptImageUrl: "",
    });
  };

  const handleCreate = async () => {
    try {
      if (!formData.amount || !formData.expenseDate || !formData.description) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      const payload = {
        restaurantId: formData.restaurantId,
        category: formData.category,
        amount: parseFloat(formData.amount),
        expenseDate: new Date(formData.expenseDate).toISOString(),
        description: formData.description,
        receiptImageUrl: formData.receiptImageUrl || undefined,
      };

      const response = await fetch("/api/owner/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Success",
          description: "Expense added successfully",
        });
        setIsCreateOpen(false);
        resetForm();
        fetchExpenses();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to add expense",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add expense",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async () => {
    if (!editingExpense) return;

    try {
      const payload: any = {};
      if (formData.category !== editingExpense.category) payload.category = formData.category;
      if (formData.amount) {
        const amount = parseFloat(formData.amount);
        if (amount !== editingExpense.amount / 100) payload.amount = amount;
      }
      if (formData.expenseDate !== editingExpense.expenseDate.split("T")[0])
        payload.expenseDate = new Date(formData.expenseDate).toISOString();
      if (formData.description !== editingExpense.description)
        payload.description = formData.description;
      if (formData.receiptImageUrl !== (editingExpense.receiptImageUrl || ""))
        payload.receiptImageUrl = formData.receiptImageUrl;

      const response = await fetch(`/api/owner/expenses/${editingExpense.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Success",
          description: "Expense updated successfully",
        });
        setIsEditOpen(false);
        setEditingExpense(null);
        fetchExpenses();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update expense",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update expense",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
      const response = await fetch(`/api/owner/expenses/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Success",
          description: "Expense deleted successfully",
        });
        fetchExpenses();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete expense",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (categoryFilter !== "all") params.append("category", categoryFilter);
    if (startDate) params.append("startDate", new Date(startDate).toISOString());
    if (endDate) params.append("endDate", new Date(endDate).toISOString());

    window.open(`/api/owner/expenses/reports/export?${params.toString()}`, "_blank");
  };

  const openEditDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      restaurantId: expense.restaurant.id,
      category: expense.category as any,
      amount: (expense.amount / 100).toString(),
      expenseDate: expense.expenseDate.split("T")[0],
      description: expense.description,
      receiptImageUrl: expense.receiptImageUrl || "",
    });
    setIsEditOpen(true);
  };

  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  if (!selectedRestaurant) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">Please select a restaurant</p>
          <p className="text-sm text-muted-foreground mt-2">Use the restaurant switcher in the header to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Expenses</h1>
          <p className="text-muted-foreground">Track and manage your restaurant expenses for {selectedRestaurant.restaurant.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push("/owner/expenses/reports")}>
            <BarChart3 className="mr-2 h-4 w-4" />
            View Reports
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Expense</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Restaurant</Label>
                  <div className="flex items-center gap-2 p-3 border rounded-md bg-muted">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{selectedRestaurant?.restaurant.name}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Category *</Label>
                  <ClientOnly>
                    <Select
                      value={formData.category}
                      onValueChange={(v: any) => setFormData({ ...formData, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getAllExpenseCategories().map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </ClientOnly>
                </div>

                <div className="space-y-2">
                  <Label>Amount (₹) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Date *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="date"
                      value={formData.expenseDate}
                      onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the expense"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Receipt Image URL</Label>
                  <Input
                    value={formData.receiptImageUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, receiptImageUrl: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>Add Expense</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{formatPrice(totalAmount)}</div>
          <p className="text-sm text-muted-foreground mt-1">
            Based on {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-sm">Category:</Label>
          <ClientOnly>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {getAllExpenseCategories().map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ClientOnly>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-sm">From:</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-[150px]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-sm">To:</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-[150px]"
          />
        </div>

        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Restaurant</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
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
            ) : expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No expenses found. Add your first expense to get started.
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{formatDate(expense.expenseDate)}</TableCell>
                  <TableCell>{expense.restaurant.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getExpenseCategoryLabel(expense.category as any)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{expense.description}</TableCell>
                  <TableCell className="font-medium">{formatPrice(expense.amount)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(expense)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(expense.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <ClientOnly>
                <Select
                  value={formData.category}
                  onValueChange={(v: any) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAllExpenseCategories().map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ClientOnly>
            </div>

            <div className="space-y-2">
              <Label>Amount (₹) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.expenseDate}
                onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Receipt Image URL</Label>
              <Input
                value={formData.receiptImageUrl}
                onChange={(e) => setFormData({ ...formData, receiptImageUrl: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Update Expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
