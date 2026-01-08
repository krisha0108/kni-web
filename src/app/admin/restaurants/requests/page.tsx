"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { Check, X } from "lucide-react";

interface Restaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  status: string;
  createdAt: string;
  owner: { id: string; name: string; email: string };
}

export default function RestaurantRequestsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const { toast } = useToast();

  const fetchRestaurants = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/restaurants/requests?status=" + statusFilter);
      const data = await response.json();
      if (data.ok) setRestaurants(data.data.items);
    } catch {
      toast({ title: "Error", description: "Failed to fetch restaurants", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, [statusFilter]);

  const handleApprove = async (restaurant: Restaurant) => {
    try {
      const response = await fetch("/api/admin/restaurants/" + restaurant.id, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Restaurant approved" });
        fetchRestaurants();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to approve restaurant", variant: "destructive" });
    }
  };

  const handleReject = async () => {
    if (!selectedRestaurant || !rejectReason) return;
    try {
      const response = await fetch("/api/admin/restaurants/" + selectedRestaurant.id, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason: rejectReason }),
      });
      const data = await response.json();
      if (data.ok) {
        toast({ title: "Success", description: "Restaurant rejected" });
        setIsRejectOpen(false);
        setSelectedRestaurant(null);
        setRejectReason("");
        fetchRestaurants();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to reject restaurant", variant: "destructive" });
    }
  };

  const statusColors: Record<string, "default" | "success" | "destructive" | "warning"> = {
    PENDING: "warning",
    APPROVED: "success",
    REJECTED: "destructive",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Restaurant Requests</h1>
        <p className="text-muted-foreground">Review and manage restaurant approval requests</p>
      </div>

      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Restaurant</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : restaurants.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No restaurants found</TableCell></TableRow>
            ) : (
              restaurants.map((restaurant) => (
                <TableRow key={restaurant.id}>
                  <TableCell className="font-medium">{restaurant.name}</TableCell>
                  <TableCell>
                    <div>{restaurant.owner.name}</div>
                    <div className="text-sm text-muted-foreground">{restaurant.owner.email}</div>
                  </TableCell>
                  <TableCell>
                    <div>{restaurant.address}</div>
                    <div className="text-sm text-muted-foreground">{restaurant.city}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[restaurant.status]}>{restaurant.status}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(restaurant.createdAt)}</TableCell>
                  <TableCell>
                    {restaurant.status === "PENDING" && (
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="ghost" onClick={() => handleApprove(restaurant)}>
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => { setSelectedRestaurant(restaurant); setIsRejectOpen(true); }}>
                          <X className="h-4 w-4 text-red-600" />
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

      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Restaurant</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting "{selectedRestaurant?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
