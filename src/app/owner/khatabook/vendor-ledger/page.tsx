"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useRestaurant } from "@/contexts/restaurant-context";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Search,
  ArrowUpCircle,
  ArrowDownCircle,
  FileText,
  Calendar
} from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils";

interface VendorLedgerEntry {
  id: string;
  vendorName: string;
  vendorPhone: string | null;
  vendorGST: string | null;
  entryType: "PURCHASE" | "PAYMENT" | "CREDIT_NOTE" | "DEBIT_NOTE";
  amount: number;
  paymentMode?: string;
  description: string;
  billNumber?: string;
  billDate?: string;
  dueDate?: string;
  balanceAfter: number;
  entryDate: string;
  creator?: {
    id: string;
    name: string;
  };
}

interface VendorSummary {
  vendorName: string;
  vendorPhone: string | null;
  vendorGST: string | null;
  balance: number;
  totalPurchases: number;
  totalPayments: number;
  lastTransactionDate: Date;
  entryCount: number;
}

const entryTypeLabels = {
  PURCHASE: "Purchase",
  PAYMENT: "Payment",
  CREDIT_NOTE: "Credit Note",
  DEBIT_NOTE: "Debit Note",
};

const entryTypeColors: Record<string, "default" | "success" | "warning" | "destructive"> = {
  PURCHASE: "destructive",
  PAYMENT: "success",
  CREDIT_NOTE: "default",
  DEBIT_NOTE: "warning",
};

const paymentModes = ["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "CARD", "OTHER"];

export default function VendorLedgerPage() {
  const [entries, setEntries] = useState<VendorLedgerEntry[]>([]);
  const [vendors, setVendors] = useState<VendorSummary[]>([]);
  const [summary, setSummary] = useState({
    totalVendors: 0,
    totalDue: 0,
    totalAdvance: 0,
    netBalance: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");

  const [selectedVendor, setSelectedVendor] = useState("__all__");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [form, setForm] = useState({
    vendorName: "",
    vendorPhone: "",
    vendorGST: "",
    entryType: "PURCHASE" as "PURCHASE" | "PAYMENT" | "CREDIT_NOTE" | "DEBIT_NOTE",
    amount: "",
    paymentMode: "CASH",
    description: "",
    billNumber: "",
    billDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    entryDate: new Date().toISOString().split("T")[0],
  });

  const { toast } = useToast();
  const { selectedRestaurant } = useRestaurant();

  useEffect(() => {
    if (selectedRestaurant) {
      fetchVendorSummary();
      fetchEntries();
    }
  }, [selectedRestaurant]);

  const fetchVendorSummary = async () => {
    if (!selectedRestaurant) return;

    try {
      const response = await fetch(
        `/api/owner/vendor-ledger/summary?restaurantId=${selectedRestaurant.restaurantId}`
      );
      const data = await response.json();

      if (data.ok) {
        setVendors(data.data.vendors || []);
        setSummary(data.data.summary || { totalVendors: 0, totalDue: 0, totalAdvance: 0, netBalance: 0 });
      }
    } catch (error) {
      console.error("Failed to fetch vendor summary:", error);
    }
  };

  const fetchEntries = async () => {
    if (!selectedRestaurant) return;

    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        restaurantId: selectedRestaurant.restaurantId,
      });

      if (selectedVendor && selectedVendor !== "__all__") params.append("vendorName", selectedVendor);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/owner/vendor-ledger?${params}`);
      const data = await response.json();

      if (data.ok) {
        setEntries(data.data || []);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch ledger entries",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch ledger entries",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant) return;

    if (!form.vendorName.trim()) {
      toast({
        title: "Error",
        description: "Vendor name is required",
        variant: "destructive",
      });
      return;
    }

    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (!form.description.trim()) {
      toast({
        title: "Error",
        description: "Description is required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/owner/vendor-ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: selectedRestaurant.restaurantId,
          vendorName: form.vendorName.trim(),
          vendorPhone: form.vendorPhone.trim() || undefined,
          vendorGST: form.vendorGST.trim() || undefined,
          entryType: form.entryType,
          amount: parseFloat(form.amount),
          paymentMode: (form.entryType === "PAYMENT" && form.paymentMode) || undefined,
          description: form.description.trim(),
          billNumber: form.billNumber.trim() || undefined,
          billDate: form.billDate || undefined,
          dueDate: form.dueDate || undefined,
          entryDate: form.entryDate,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: "Entry added successfully",
        });
        setIsDialogOpen(false);
        resetForm();
        fetchVendorSummary();
        fetchEntries();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to add entry",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add entry",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setForm({
      vendorName: "",
      vendorPhone: "",
      vendorGST: "",
      entryType: "PURCHASE",
      amount: "",
      paymentMode: "CASH",
      description: "",
      billNumber: "",
      billDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      entryDate: new Date().toISOString().split("T")[0],
    });
  };

  const handleVendorSelect = (vendorName: string) => {
    const vendor = vendors.find((v) => v.vendorName === vendorName);
    if (vendor) {
      setForm({
        ...form,
        vendorName: vendor.vendorName,
        vendorPhone: vendor.vendorPhone || "",
        vendorGST: vendor.vendorGST || "",
      });
    }
  };

  const openAddEntryDialog = (type: "PURCHASE" | "PAYMENT") => {
    setForm({ ...form, entryType: type });
    setIsDialogOpen(true);
  };

  const canCreate = selectedRestaurant?.role === "OWNER" || selectedRestaurant?.role === "MANAGER" || selectedRestaurant?.role === "ACCOUNTANT";

  if (!selectedRestaurant) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a restaurant first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Vendor Ledger</h1>
          <p className="text-muted-foreground">Manage vendor purchases and payments</p>
        </div>
        {canCreate && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openAddEntryDialog("PURCHASE")}>
              <ArrowDownCircle className="mr-2 h-4 w-4 text-red-600" />
              Add Purchase
            </Button>
            <Button onClick={() => openAddEntryDialog("PAYMENT")}>
              <ArrowUpCircle className="mr-2 h-4 w-4 text-green-600" />
              Add Payment
            </Button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalVendors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Due</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatPrice(summary.totalDue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Advance</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatPrice(summary.totalAdvance)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.netBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatPrice(summary.netBalance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="summary">Vendor Summary</TabsTrigger>
          <TabsTrigger value="transactions">All Transactions</TabsTrigger>
        </TabsList>

        {/* Vendor Summary Tab */}
        <TabsContent value="summary" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Balances</CardTitle>
              <CardDescription>
                Overview of all vendors with outstanding balances
              </CardDescription>
            </CardHeader>
            <CardContent>
              {vendors.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No vendor transactions yet</p>
                </div>
              ) : (
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor Name</TableHead>
                      <TableHead>Contact</TableHead>
                      
                      <TableHead>Total Purchases</TableHead>
                      <TableHead>Total Payments</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Last Transaction</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  
                  <TableBody>
                    {vendors.map((vendor) => (
                      <TableRow key={vendor.vendorName}>
                        <TableCell className="font-medium">
                          <div>
                            <p>{vendor.vendorName}</p>
                            {vendor.vendorGST && (
                              <p className="text-xs text-muted-foreground">GST: {vendor.vendorGST}</p>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>{vendor.vendorPhone || "-"}</TableCell>
                        <TableCell>{formatPrice(vendor.totalPurchases)}</TableCell>
                        <TableCell>{formatPrice(vendor.totalPayments)}</TableCell>
                        <TableCell>
                          <span className={`font-semibold ${vendor.balance > 0 ? 'text-red-600' : vendor.balance < 0 ? 'text-green-600' : ''}`}>
                            {formatPrice(vendor.balance)}
                          </span>
                        </TableCell>
                        
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(vendor.lastTransactionDate.toString())}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedVendor(vendor.vendorName);
                              setActiveTab("transactions");
                              setTimeout(fetchEntries, 100);
                            }}
                          >
                            View Ledger
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                        
                        
                  
                      
                
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>
                    All vendor purchases and payments
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="All Vendors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Vendors</SelectItem>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.vendorName} value={vendor.vendorName}>
                          {vendor.vendorName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="Start Date"
                    className="w-full sm:w-auto"
                  />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="End Date"
                    className="w-full sm:w-auto"
                  />
                  <Button onClick={fetchEntries}>
                    <Search className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                  {(selectedVendor !== "__all__" || startDate || endDate) && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedVendor("__all__");
                        setStartDate("");
                        setEndDate("");
                        setTimeout(fetchEntries, 100);
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading transactions...</p>
                </div>
              ) : entries.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No transactions found</p>
                </div>
              ) : (
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Vendor</TableHead>
                      
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Bill No.</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Balance After</TableHead>
                    </TableRow>
                  </TableHeader>
                  
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm">
                          {formatDate(entry.entryDate)}
                        </TableCell>
                        
                        <TableCell className="font-medium">
                          {entry.vendorName}
                        </TableCell>
                        <TableCell>
                          <Badge variant={entryTypeColors[entry.entryType]}>
                            {entryTypeLabels[entry.entryType]}
                          </Badge>
                        </TableCell>
                        
                        <TableCell className="max-w-xs truncate">
                          {entry.description}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {entry.billNumber || "-"}
                        </TableCell>
                        
                        <TableCell>
                          <span className={
                            entry.entryType === "PURCHASE" || entry.entryType === "DEBIT_NOTE"
                              ? "text-red-600"
                              : "text-green-600"
                          }>
                            {entry.entryType === "PURCHASE" || entry.entryType === "DEBIT_NOTE" ? "+" : "-"}
                            {formatPrice(entry.amount)}
                          </span>
                        </TableCell>
                        
                        <TableCell className="font-semibold">
                          <span className={entry.balanceAfter > 0 ? "text-red-600" : entry.balanceAfter < 0 ? "text-green-600" : ""}>
                            {formatPrice(entry.balanceAfter)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                        
                        
                        
                        
                  
                      
                
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Entry Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>
              Add {form.entryType === "PURCHASE" ? "Purchase" : "Payment"} Entry
            </DialogTitle>
            <DialogDescription>
              Record a new vendor {form.entryType === "PURCHASE" ? "purchase" : "payment"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="vendorName">
                    Vendor Name <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="vendorName"
                      value={form.vendorName}
                      onChange={(e) => setForm({ ...form, vendorName: e.target.value })}
                      placeholder="Enter vendor name"
                      required
                      list="vendor-list"
                    />
                    <datalist id="vendor-list">
                      {vendors.map((vendor) => (
                        <option key={vendor.vendorName} value={vendor.vendorName} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendorPhone">Phone</Label>
                  <Input
                    id="vendorPhone"
                    value={form.vendorPhone}
                    onChange={(e) => setForm({ ...form, vendorPhone: e.target.value })}
                    placeholder="Vendor phone"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendorGST">GST Number</Label>
                  <Input
                    id="vendorGST"
                    value={form.vendorGST}
                    onChange={(e) => setForm({ ...form, vendorGST: e.target.value })}
                    placeholder="Vendor GST"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entryType">
                    Entry Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.entryType}
                    onValueChange={(value: any) => setForm({ ...form, entryType: value })}
                  >
                    <SelectTrigger id="entryType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PURCHASE">Purchase</SelectItem>
                      <SelectItem value="PAYMENT">Payment</SelectItem>
                      <SelectItem value="CREDIT_NOTE">Credit Note</SelectItem>
                      <SelectItem value="DEBIT_NOTE">Debit Note</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">
                    Amount (₹) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="Enter amount"
                    required
                  />
                </div>
              </div>

              {form.entryType === "PAYMENT" && (
                <div className="space-y-2">
                  <Label htmlFor="paymentMode">Payment Mode</Label>
                  <Select
                    value={form.paymentMode}
                    onValueChange={(value) => setForm({ ...form, paymentMode: value })}
                  >
                    <SelectTrigger id="paymentMode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentModes.map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {mode.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Enter description or notes"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billNumber">Bill Number</Label>
                  <Input
                    id="billNumber"
                    value={form.billNumber}
                    onChange={(e) => setForm({ ...form, billNumber: e.target.value })}
                    placeholder="Bill/Invoice #"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billDate">Bill Date</Label>
                  <Input
                    id="billDate"
                    type="date"
                    value={form.billDate}
                    onChange={(e) => setForm({ ...form, billDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="entryDate">
                    Entry Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="entryDate"
                    type="date"
                    value={form.entryDate}
                    onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              {form.entryType === "PURCHASE" && (
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}