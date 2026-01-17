"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { useRestaurant } from "@/contexts/restaurant-context";
import { UserPlus, Edit, Trash2, Phone, Calendar, DollarSign, Search } from "lucide-react";
import { formatDate, formatPrice } from "@/lib/utils";

interface Staff {
  id: string;
  name: string;
  phone: string;
  designation: string;
  staffType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN";
  status: "ACTIVE" | "ON_LEAVE" | "RESIGNED" | "TERMINATED";
  joiningDate: string;
  leavingDate?: string;
  monthlySalary?: number; // in paise
  dailyWage?: number; // in paise
  _count?: {
    attendance: number;
    salaryRecords: number;
  };
}

const staffTypeLabels = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
  INTERN: "Intern",
};

const staffStatusLabels = {
  ACTIVE: "Active",
  ON_LEAVE: "On Leave",
  RESIGNED: "Resigned",
  TERMINATED: "Terminated",
};

const statusColors: Record<string, "default" | "success" | "warning" | "destructive"> = {
  ACTIVE: "success",
  ON_LEAVE: "warning",
  RESIGNED: "default",
  TERMINATED: "destructive",
};

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const { selectedRestaurant } = useRestaurant();

  const [form, setForm] = useState<{
    name: string;
    phone: string;
    designation: string;
    staffType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "DAILY_WAGE";
    joiningDate: string;
    monthlySalary: string;
    dailyWage: string;
  }>({
    name: "",
    phone: "",
    designation: "",
    staffType: "FULL_TIME",
    joiningDate: new Date().toISOString().split("T")[0],
    monthlySalary: "",
    dailyWage: "",
  });

  useEffect(() => {
    if (selectedRestaurant) {
      fetchStaff();
    }
  }, [selectedRestaurant, statusFilter]);

  const fetchStaff = async () => {
    if (!selectedRestaurant) return;

    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        restaurantId: selectedRestaurant.restaurantId,
        ...(statusFilter !== "all" && { status: statusFilter }),
      });

      const response = await fetch(`/api/owner/staff?${params}`);
      const data = await response.json();

      if (data.ok) {
        setStaff(data.data || []);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch staff",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch staff",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant) return;

    // Validation
    if (form.staffType === "FULL_TIME" || form.staffType === "CONTRACT") {
      if (!form.monthlySalary || parseFloat(form.monthlySalary) <= 0) {
        toast({
          title: "Error",
          description: "Monthly salary is required for full-time/contract staff",
          variant: "destructive",
        });
        return;
      }
    }

    if (form.staffType === "PART_TIME") {
      if (!form.dailyWage || parseFloat(form.dailyWage) <= 0) {
        toast({
          title: "Error",
          description: "Daily wage is required for part-time staff",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/owner/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: selectedRestaurant.restaurantId,
          name: form.name,
          phone: form.phone,
          designation: form.designation,
          staffType: form.staffType,
          joiningDate: form.joiningDate,
          monthlySalary: form.monthlySalary ? parseFloat(form.monthlySalary) : undefined,
          dailyWage: form.dailyWage ? parseFloat(form.dailyWage) : undefined,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: "Staff member added successfully",
        });
        setIsDialogOpen(false);
        resetForm();
        fetchStaff();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to add staff member",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add staff member",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      phone: "",
      designation: "",
      staffType: "FULL_TIME",
      joiningDate: new Date().toISOString().split("T")[0],
      monthlySalary: "",
      dailyWage: "",
    });
  };

  const filteredStaff = staff.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone.includes(searchQuery);

    return matchesSearch;
  });

  if (!selectedRestaurant) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a restaurant first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Staff Management</h1>
          <p className="text-muted-foreground">Manage your restaurant staff</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Staff Member
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, designation, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="ON_LEAVE">On Leave</SelectItem>
            <SelectItem value="RESIGNED">Resigned</SelectItem>
            <SelectItem value="TERMINATED">Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff Members ({filteredStaff.length})</CardTitle>
          <CardDescription>
            List of all staff members in {selectedRestaurant.restaurant.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading staff...</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchQuery ? "No staff members found matching your search" : "No staff members added yet"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Salary/Wage</TableHead>
                  <TableHead>Joining Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.designation}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{staffTypeLabels[member.staffType]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[member.status]}>
                        {staffStatusLabels[member.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {member.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      {member.monthlySalary
                        ? formatPrice(member.monthlySalary) + "/month"
                        : member.dailyWage
                        ? formatPrice(member.dailyWage) + "/day"
                        : "-"}
                    </TableCell>
                    <TableCell>{formatDate(member.joiningDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Staff Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
            <DialogDescription>
              Add a new staff member to {selectedRestaurant.restaurant.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter staff name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    Phone <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="Enter phone number"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="designation">
                    Designation <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="designation"
                    value={form.designation}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })}
                    placeholder="Chef, Waiter, Manager, etc."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staffType">
                    Staff Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.staffType}
                    onValueChange={(value: any) => setForm({ ...form, staffType: value })}
                  >
                    <SelectTrigger id="staffType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL_TIME">Full Time</SelectItem>
                      <SelectItem value="PART_TIME">Part Time</SelectItem>
                      <SelectItem value="CONTRACT">Contract</SelectItem>
                      <SelectItem value="INTERN">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="joiningDate">
                  Joining Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="joiningDate"
                  type="date"
                  value={form.joiningDate}
                  onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
                  required
                />
              </div>

              {(form.staffType === "FULL_TIME" || form.staffType === "CONTRACT") && (
                <div className="space-y-2">
                  <Label htmlFor="monthlySalary">
                    Monthly Salary (₹) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="monthlySalary"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.monthlySalary}
                    onChange={(e) => setForm({ ...form, monthlySalary: e.target.value })}
                    placeholder="Enter monthly salary"
                    required
                  />
                </div>
              )}

              {form.staffType === "PART_TIME" && (
                <div className="space-y-2">
                  <Label htmlFor="dailyWage">
                    Daily Wage (₹) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="dailyWage"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.dailyWage}
                    onChange={(e) => setForm({ ...form, dailyWage: e.target.value })}
                    placeholder="Enter daily wage"
                    required
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
                {isSaving ? "Adding..." : "Add Staff Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
