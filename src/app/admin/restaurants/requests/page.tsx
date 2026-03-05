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
import { Check, X, Eye, ExternalLink, FileText, Building2, Phone } from "lucide-react";
import Image from "next/image";

interface Restaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  pincode: string | null;
  restaurantImageUrl: string | null;
  fssaiNumber: string | null;
  fssaiCertificateUrl: string | null;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  owner: { id: string; name: string; email: string; phone: string | null };
}

export default function RestaurantRequestsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
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
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Restaurant Requests</h1>
        <p className="text-muted-foreground">Review and manage restaurant approval requests</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
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
              <TableHead className="hidden md:table-cell">Owner</TableHead>
              
              <TableHead className="hidden lg:table-cell">Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Date</TableHead>
              <TableHead className="hidden lg:table-cell">FSSAI</TableHead>
              <TableHead className="w-[100px] sm:w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : restaurants.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No restaurants found</TableCell></TableRow>
            ) : (
              restaurants.map((restaurant) => (
                
                <TableRow key={restaurant.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      {restaurant.restaurantImageUrl ? (
                        <Image
                          src={restaurant.restaurantImageUrl}
                          alt={restaurant.name}
                          width={40}
                          height={40}
                          className="rounded-md object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <span>{restaurant.name}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell className="hidden md:table-cell">
                    <div>{restaurant.owner.name}</div>
                    <div className="text-sm text-muted-foreground">{restaurant.owner.email}</div>
                    {restaurant.owner.phone && (
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {restaurant.owner.phone}
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell className="hidden lg:table-cell">
                    <div>{restaurant.address}</div>
                    <div className="text-sm text-muted-foreground">
                      {restaurant.city}{restaurant.pincode ? `, ${restaurant.pincode}` : ""}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant={statusColors[restaurant.status]}>{restaurant.status}</Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{formatDate(restaurant.createdAt)}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {restaurant.fssaiNumber ? (
                      <div className="text-sm">
                        <div className="font-mono">{restaurant.fssaiNumber}</div>
                        {restaurant.fssaiCertificateUrl && (
                          <a
                            href={restaurant.fssaiCertificateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1 mt-1"
                          >
                            <FileText className="h-3 w-3" />
                            View Certificate
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Not provided</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => { setSelectedRestaurant(restaurant); setIsDetailsOpen(true); }}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {restaurant.status === "PENDING" && (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => handleApprove(restaurant)} title="Approve">
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => { setSelectedRestaurant(restaurant); setIsRejectOpen(true); }} title="Reject">
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
                  
                  
                  
                  
                
          
              
        
      </div>

      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
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

      {/* Restaurant Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Restaurant Details</DialogTitle>
            <DialogDescription>
              Complete information for review
            </DialogDescription>
          </DialogHeader>
          {selectedRestaurant && (
            <div className="space-y-6 py-4">
              {/* Restaurant Image */}
              <div className="flex justify-center">
                {selectedRestaurant.restaurantImageUrl ? (
                  <div className="relative w-full max-w-[200px]">
                    <Image
                      src={selectedRestaurant.restaurantImageUrl}
                      alt={selectedRestaurant.name}
                      width={200}
                      height={150}
                      className="rounded-lg object-cover w-full h-auto"
                    />
                    <a
                      href={selectedRestaurant.restaurantImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-md hover:bg-black/70"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                ) : (
                  <div className="w-full max-w-[200px] aspect-[4/3] rounded-lg bg-muted flex items-center justify-center">
                    <Building2 className="h-12 w-12 text-muted-foreground" />
                    <span className="sr-only">No image provided</span>
                  </div>
                )}
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Restaurant Name</Label>
                  <p className="font-medium">{selectedRestaurant.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div><Badge variant={statusColors[selectedRestaurant.status]}>{selectedRestaurant.status}</Badge></div>
                </div>
              </div>

              {/* Owner Info */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Owner Information</Label>
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <p className="font-medium">{selectedRestaurant.owner.name}</p>
                  <p className="text-sm">{selectedRestaurant.owner.email}</p>
                  {selectedRestaurant.owner.phone && (
                    <p className="text-sm flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {selectedRestaurant.owner.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Address</Label>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p>{selectedRestaurant.address}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedRestaurant.city}
                    {selectedRestaurant.pincode && ` - ${selectedRestaurant.pincode}`}
                  </p>
                </div>
              </div>

              {/* FSSAI Details */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">FSSAI Details</Label>
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">FSSAI Number:</span>
                    {selectedRestaurant.fssaiNumber ? (
                      <span className="font-mono font-medium">{selectedRestaurant.fssaiNumber}</span>
                    ) : (
                      <Badge variant="destructive">Not Provided</Badge>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">FSSAI Certificate:</span>
                    {selectedRestaurant.fssaiCertificateUrl ? (
                      <a
                        href={selectedRestaurant.fssaiCertificateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                      >
                        <FileText className="h-4 w-4" />
                        View Certificate
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <Badge variant="destructive">Not Uploaded</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Rejection Reason (if rejected) */}
              {selectedRestaurant.status === "REJECTED" && selectedRestaurant.rejectionReason && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Rejection Reason</Label>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-800">{selectedRestaurant.rejectionReason}</p>
                  </div>
                </div>
              )}

              {/* Request Date */}
              <div>
                <Label className="text-muted-foreground">Request Date</Label>
                <p>{formatDate(selectedRestaurant.createdAt)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedRestaurant?.status === "PENDING" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => { setIsDetailsOpen(false); setIsRejectOpen(true); }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => { handleApprove(selectedRestaurant); setIsDetailsOpen(false); }}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
            {selectedRestaurant?.status !== "PENDING" && (
              <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}