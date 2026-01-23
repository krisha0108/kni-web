"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientOnly } from "@/components/client-only";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, CheckCircle2, XCircle, Clock, FileText, Image as ImageIcon, Shield, Wrench, IndianRupee, History, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getWarrantyStatus, getEquipmentStatusColor, getEquipmentStatusLabel } from "@/lib/equipment";
import { getAMCDurationLabel, getAMCStatusColor, getAMCStatusLabel } from "@/lib/amc";

interface ServiceHistoryItem {
  id: string;
  status: string;
  totalAmount: number;
  problemDescription: string | null;
  createdAt: string;
  slotStartDateTime: string | null;
  engineerAssignments: {
    id: string;
    status: string;
    engineer: { id: string; name: string };
    workLog?: {
      id: string;
      completionNote: string;
      createdAt: string;
    };
  }[];
  items: {
    id: string;
    qty: number;
    serviceItem?: { id: string; name: string };
    partItem?: { id: string; name: string };
  }[];
}

interface ServiceTemplate {
  id: string;
  name: string;
  description: string | null;
  estimatedPrice: number | null;
  isCommon: boolean;
}

interface Equipment {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  installLocation: string | null;
  purchaseDate: string;
  warrantyEndDate: string | null;
  status: string;
  notes: string | null;
  billImageUrl: string | null;
  warrantyCardUrl: string | null;
  photoUrls: string[];
  restaurant: {
    id: string;
    name: string;
    status: string;
  };
  equipmentType?: {
    id: string;
    name: string;
    category: { id: string; name: string };
    serviceTemplates: ServiceTemplate[];
  };
  serviceHistory: ServiceHistoryItem[];
  totalSpend: number;
  completedServicesCount: number;
  createdAt: string;
}

interface AMCSubscription {
  id: string;
  planName: string | null;
  planDescription: string | null;
  duration: string;
  serviceLimit: number;
  servicesUsed: number;
  featuresJson: string[];
  totalAmount: number;
  startDate: string;
  endDate: string;
  status: string;
  autoRenew: boolean;
  createdAt: string;
  usageLogs?: {
    id: string;
    serviceDate: string;
    serviceType: string;
    notes: string | null;
    createdAt: string;
  }[];
}

export default function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [amcSubscriptions, setAmcSubscriptions] = useState<AMCSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateAmcOpen, setIsCreateAmcOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const [amcFormData, setAmcFormData] = useState({
    planName: "",
    planDescription: "",
    duration: "MONTHLY",
    serviceLimit: 1,
    featuresJson: [] as string[],
    totalAmount: 0,
    startDate: "",
    autoRenew: false,
  });

  const [featureInput, setFeatureInput] = useState("");

  // Service booking state
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [serviceFormData, setServiceFormData] = useState({
    slotDate: "",
    slotTime: "",
    problemDescription: "",
  });

  useEffect(() => {
    fetchEquipment();
    fetchAmcSubscriptions();
  }, [resolvedParams.id]);

  const fetchEquipment = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/owner/equipment/${resolvedParams.id}`);
      const data = await response.json();

      if (data.ok) {
        setEquipment(data.data);
        setAmcFormData(prev => ({
          ...prev,
          planName: `${data.data.name} Maintenance Plan`,
        }));
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch equipment",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch equipment details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAmcSubscriptions = async () => {
    try {
      const response = await fetch(`/api/owner/equipment/${resolvedParams.id}/amc`);
      const data = await response.json();

      if (data.ok) {
        setAmcSubscriptions(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch AMC subscriptions:", error);
    }
  };

  const handleCreateAmc = async () => {
    try {
      if (!amcFormData.planName || !amcFormData.startDate || amcFormData.serviceLimit < 1) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/owner/equipment/${resolvedParams.id}/amc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipmentId: resolvedParams.id,
          planName: amcFormData.planName,
          planDescription: amcFormData.planDescription || undefined,
          duration: amcFormData.duration,
          serviceLimit: amcFormData.serviceLimit,
          featuresJson: amcFormData.featuresJson.length > 0 ? amcFormData.featuresJson : undefined,
          totalAmount: Math.round(amcFormData.totalAmount * 100), // Convert to paise
          startDate: new Date(amcFormData.startDate).toISOString(),
          autoRenew: amcFormData.autoRenew,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: "AMC subscription created successfully",
        });
        setIsCreateAmcOpen(false);
        setAmcFormData({
          planName: equipment ? `${equipment.name} Maintenance Plan` : "",
          planDescription: "",
          duration: "MONTHLY",
          serviceLimit: 1,
          featuresJson: [],
          totalAmount: 0,
          startDate: "",
          autoRenew: false,
        });
        setFeatureInput("");
        fetchAmcSubscriptions();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create AMC subscription",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create AMC subscription",
        variant: "destructive",
      });
    }
  };

  const handleAddFeature = () => {
    if (featureInput.trim()) {
      setAmcFormData({
        ...amcFormData,
        featuresJson: [...amcFormData.featuresJson, featureInput.trim()],
      });
      setFeatureInput("");
    }
  };

  const handleRemoveFeature = (index: number) => {
    setAmcFormData({
      ...amcFormData,
      featuresJson: amcFormData.featuresJson.filter((_, i) => i !== index),
    });
  };

  const handleCancelAmc = async (amcId: string) => {
    if (!confirm("Are you sure you want to cancel this AMC subscription?")) return;

    try {
      const response = await fetch(`/api/owner/equipment/${resolvedParams.id}/amc/${amcId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "AMC subscription cancelled successfully",
        });
        fetchAmcSubscriptions();
      } else {
        toast({
          title: "Error",
          description: "Failed to cancel AMC subscription",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel AMC subscription",
        variant: "destructive",
      });
    }
  };

  const handleToggleAutoRenew = async (amcId: string, currentValue: boolean) => {
    try {
      const response = await fetch(`/api/owner/equipment/${resolvedParams.id}/amc/${amcId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoRenew: !currentValue }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Auto-renew ${!currentValue ? "enabled" : "disabled"}`,
        });
        fetchAmcSubscriptions();
      } else {
        toast({
          title: "Error",
          description: "Failed to update auto-renew",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update auto-renew",
        variant: "destructive",
      });
    }
  };

  const handleServiceBooking = async () => {
    try {
      // Validate required fields
      if (!serviceFormData.slotDate || !serviceFormData.slotTime) {
        toast({
          title: "Error",
          description: "Please provide slot date and time",
          variant: "destructive",
        });
        return;
      }

      // If there are service templates available but none selected, show error
      if (equipment?.equipmentType?.serviceTemplates &&
          equipment.equipmentType.serviceTemplates.length > 0 &&
          selectedServices.length === 0) {
        toast({
          title: "Error",
          description: "Please select at least one service",
          variant: "destructive",
        });
        return;
      }

      const slotDateTime = new Date(`${serviceFormData.slotDate}T${serviceFormData.slotTime}`);

      const response = await fetch("/api/owner/equipment-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: equipment!.restaurant.id,
          equipmentId: equipment!.id,
          serviceTemplateIds: selectedServices.length > 0 ? selectedServices : undefined,
          slotStartDateTime: slotDateTime.toISOString(),
          problemDescription: serviceFormData.problemDescription || undefined,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: "Service request created successfully",
        });
        setIsServiceDialogOpen(false);
        setSelectedServices([]);
        setServiceFormData({
          slotDate: "",
          slotTime: "",
          problemDescription: "",
        });
        fetchEquipment(); // Refresh to show new service in history
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create service request",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create service request",
        variant: "destructive",
      });
    }
  };

  const toggleServiceSelection = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading equipment details...</p>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">Equipment not found</p>
        <Button onClick={() => router.push("/owner/equipment")}>
          Back to Equipment List
        </Button>
      </div>
    );
  }

  const warrantyStatus = getWarrantyStatus(equipment.warrantyEndDate);
  const activeAmc = amcSubscriptions.find(amc => amc.status === "ACTIVE");
  const photoUrls = Array.isArray(equipment.photoUrls) ? equipment.photoUrls : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/owner/equipment")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{equipment.name}</h1>
            <p className="text-muted-foreground">
              {equipment.equipmentType?.category?.name || (typeof equipment.category === 'object' && equipment.category !== null ? (equipment.category as { name?: string }).name : equipment.category)}
              {equipment.equipmentType && ` • ${equipment.equipmentType.name}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={getEquipmentStatusColor(equipment.status)}>
            {getEquipmentStatusLabel(equipment.status)}
          </Badge>
          <Button onClick={() => setIsServiceDialogOpen(true)}>
            <Wrench className="mr-2 h-4 w-4" />
            Request Service
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <History className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Services</p>
                <p className="text-xl font-bold">{equipment.serviceHistory?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-xl font-bold">{equipment.completedServicesCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <IndianRupee className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Spend</p>
                <p className="text-xl font-bold">₹{((equipment.totalSpend || 0) / 100).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">AMC Status</p>
                <p className="text-xl font-bold">{activeAmc ? "Active" : "None"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Equipment Info */}
        <div className="space-y-6">
          {/* Equipment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Equipment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Restaurant</Label>
                  <p className="font-medium">{equipment.restaurant.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Serial Number</Label>
                  <p className="font-medium font-mono">{equipment.serialNumber || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Purchase Date</Label>
                  <p className="font-medium">{formatDate(equipment.purchaseDate)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Warranty Status</Label>
                  <Badge variant={warrantyStatus.color === "green" ? "success" : warrantyStatus.color === "yellow" ? "warning" : "destructive"}>
                    {warrantyStatus.label}
                  </Badge>
                </div>
              </div>
              {equipment.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="mt-1">{equipment.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle>Documents & Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bill & Warranty Card */}
              <div className="grid grid-cols-2 gap-4">
                {equipment.billImageUrl && (
                  <div>
                    <Label className="text-muted-foreground mb-2 block">Purchase Bill</Label>
                    <div
                      className="relative aspect-video rounded-lg border overflow-hidden cursor-pointer hover:opacity-80 transition"
                      onClick={() => setSelectedImage(equipment.billImageUrl)}
                    >
                      <img src={equipment.billImageUrl} alt="Bill" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <FileText className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </div>
                )}
                {equipment.warrantyCardUrl && (
                  <div>
                    <Label className="text-muted-foreground mb-2 block">Warranty Card</Label>
                    <div
                      className="relative aspect-video rounded-lg border overflow-hidden cursor-pointer hover:opacity-80 transition"
                      onClick={() => setSelectedImage(equipment.warrantyCardUrl)}
                    >
                      <img src={equipment.warrantyCardUrl} alt="Warranty Card" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Shield className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Equipment Photos */}
              {photoUrls.length > 0 && (
                <div>
                  <Label className="text-muted-foreground mb-2 block">Equipment Photos</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {photoUrls.map((url, index) => (
                      <div
                        key={index}
                        className="relative aspect-square rounded-lg border overflow-hidden cursor-pointer hover:opacity-80 transition"
                        onClick={() => setSelectedImage(url)}
                      >
                        <img src={url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                          {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!equipment.billImageUrl && !equipment.warrantyCardUrl && photoUrls.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No documents or images uploaded</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Service History
                </CardTitle>
                {equipment.serviceHistory && equipment.serviceHistory.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => router.push(`/owner/bookings?equipmentId=${equipment.id}`)}>
                    View All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {equipment.serviceHistory && equipment.serviceHistory.length > 0 ? (
                <div className="space-y-4">
                  {equipment.serviceHistory.slice(0, 5).map((service) => {
                    const completedAssignment = service.engineerAssignments.find(a => a.status === "COMPLETED");
                    const statusColor =
                      service.status === "COMPLETED" ? "success" :
                      service.status === "CANCELLED" ? "destructive" :
                      service.status.includes("REJECTED") ? "destructive" :
                      "warning";

                    return (
                      <div
                        key={service.id}
                        className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition"
                        onClick={() => router.push(`/owner/bookings/${service.id}`)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-sm">
                              {(service.items?.map(item => item.serviceItem?.name || item.partItem?.name) || []).join(", ") || "Service Request"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(service.slotStartDateTime || service.createdAt)}
                            </p>
                          </div>
                          <Badge variant={statusColor} className="text-xs">
                            {service.status.replace(/_/g, " ")}
                          </Badge>
                        </div>

                        {service.problemDescription && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {service.problemDescription}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>₹{(service.totalAmount / 100).toLocaleString()}</span>
                          {completedAssignment && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                              {completedAssignment.engineer.name}
                            </span>
                          )}
                        </div>

                        {completedAssignment?.workLog && (
                          <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                            <p className="font-medium mb-1">Completion Notes:</p>
                            <p className="text-muted-foreground line-clamp-2">{completedAssignment.workLog.completionNote}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No service history yet</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => router.push(`/owner/slot-booking?equipmentId=${equipment.id}`)}
                  >
                    <Wrench className="mr-2 h-4 w-4" />
                    Request First Service
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AMC Subscriptions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  AMC Subscriptions
                </CardTitle>
                <Dialog open={isCreateAmcOpen} onOpenChange={setIsCreateAmcOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Create AMC
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create AMC Subscription</DialogTitle>
                      <DialogDescription>
                        Create a maintenance contract for this equipment
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Plan Name *</Label>
                        <Input
                          value={amcFormData.planName}
                          onChange={(e) => setAmcFormData({ ...amcFormData, planName: e.target.value })}
                          placeholder="e.g., Annual Maintenance"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={amcFormData.planDescription}
                          onChange={(e) => setAmcFormData({ ...amcFormData, planDescription: e.target.value })}
                          placeholder="Describe what's included..."
                          rows={2}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Duration *</Label>
                          <Select
                            value={amcFormData.duration}
                            onValueChange={(value) => setAmcFormData({ ...amcFormData, duration: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MONTHLY">Monthly (1 Month)</SelectItem>
                              <SelectItem value="QUARTERLY">Quarterly (3 Months)</SelectItem>
                              <SelectItem value="HALF_YEARLY">Half Yearly (6 Months)</SelectItem>
                              <SelectItem value="YEARLY">Yearly (12 Months)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Service Limit *</Label>
                          <Input
                            type="number"
                            min="1"
                            value={amcFormData.serviceLimit}
                            onChange={(e) => setAmcFormData({ ...amcFormData, serviceLimit: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Amount (₹) *</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={amcFormData.totalAmount}
                            onChange={(e) => setAmcFormData({ ...amcFormData, totalAmount: parseFloat(e.target.value) || 0 })}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Start Date *</Label>
                          <Input
                            type="date"
                            value={amcFormData.startDate}
                            onChange={(e) => setAmcFormData({ ...amcFormData, startDate: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Features</Label>
                        <div className="flex gap-2">
                          <Input
                            value={featureInput}
                            onChange={(e) => setFeatureInput(e.target.value)}
                            placeholder="Add a feature"
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddFeature())}
                          />
                          <Button type="button" onClick={handleAddFeature} size="icon">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        {amcFormData.featuresJson.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {amcFormData.featuresJson.map((feature, index) => (
                              <Badge key={index} variant="secondary" className="gap-1">
                                {feature}
                                <button onClick={() => handleRemoveFeature(index)} className="ml-1 hover:text-destructive">
                                  <XCircle className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="autoRenew"
                          checked={amcFormData.autoRenew}
                          onChange={(e) => setAmcFormData({ ...amcFormData, autoRenew: e.target.checked })}
                          className="rounded"
                        />
                        <Label htmlFor="autoRenew" className="text-sm">Enable auto-renewal</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateAmcOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateAmc}>Create AMC</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {amcSubscriptions.length > 0 ? (
                <div className="space-y-4">
                  {amcSubscriptions.map((amc) => {
                    const daysRemaining = Math.ceil((new Date(amc.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    const usagePercent = (amc.servicesUsed / amc.serviceLimit) * 100;
                    return (
                      <div
                        key={amc.id}
                        className={`border rounded-lg p-4 ${amc.status === "ACTIVE" ? "border-l-4 border-l-green-500" : ""}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold">{amc.planName || "Custom Plan"}</p>
                            {amc.planDescription && (
                              <p className="text-sm text-muted-foreground">{amc.planDescription}</p>
                            )}
                          </div>
                          <Badge variant={amc.status === "ACTIVE" ? "success" : amc.status === "EXPIRED" ? "destructive" : "secondary"}>
                            {amc.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                          <div>
                            <p className="text-muted-foreground">Duration</p>
                            <p className="font-medium">{getAMCDurationLabel(amc.duration as any)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Amount</p>
                            <p className="font-medium">₹{(amc.totalAmount / 100).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Period</p>
                            <p className="font-medium">{formatDate(amc.startDate)} - {formatDate(amc.endDate)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Auto-Renew</p>
                            <p className="font-medium">{amc.autoRenew ? "Yes" : "No"}</p>
                          </div>
                        </div>
                        {amc.status === "ACTIVE" && (
                          <>
                            <div className="mb-3">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground">Service Usage</span>
                                <span className="font-medium">{amc.servicesUsed} / {amc.serviceLimit}</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${usagePercent >= 100 ? "bg-destructive" : usagePercent >= 80 ? "bg-yellow-500" : "bg-green-500"}`}
                                  style={{ width: `${Math.min(100, usagePercent)}%` }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {amc.serviceLimit - amc.servicesUsed} services remaining • {daysRemaining > 0 ? `${daysRemaining} days left` : "Expired"}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleAutoRenew(amc.id, amc.autoRenew)}
                              >
                                {amc.autoRenew ? "Disable Auto-Renew" : "Enable Auto-Renew"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleCancelAmc(amc.id)}
                              >
                                Cancel AMC
                              </Button>
                            </div>
                          </>
                        )}
                        {amc.featuresJson && amc.featuresJson.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm font-medium mb-2">Features</p>
                            <div className="flex flex-wrap gap-2">
                              {amc.featuresJson.map((feature, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No AMC subscriptions yet</p>
                  <p className="text-sm mt-1">Create a maintenance plan to protect this equipment</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Image Preview Dialog */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Image Preview</DialogTitle>
              <DialogDescription>
                Full-size view of the image
              </DialogDescription>
            </DialogHeader>
            <img src={selectedImage} alt="Preview" className="w-full h-auto" />
          </DialogContent>
        </Dialog>
      )}

      {/* Service Booking Dialog */}
      <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Service for {equipment.name}</DialogTitle>
            <DialogDescription>
              Select services and schedule a time for maintenance
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Available Services */}
            {equipment.equipmentType && equipment.equipmentType.serviceTemplates.length > 0 ? (
              <div className="space-y-3">
                <Label className="text-base font-semibold">Available Services</Label>
                <div className="space-y-2">
                  {equipment.equipmentType.serviceTemplates.map((service) => (
                    <Card
                      key={service.id}
                      className={`cursor-pointer transition ${
                        selectedServices.includes(service.id)
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/50"
                      }`}
                      onClick={() => toggleServiceSelection(service.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="mt-0.5">
                              <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                  selectedServices.includes(service.id)
                                    ? "bg-primary border-primary"
                                    : "border-muted-foreground"
                                }`}
                              >
                                {selectedServices.includes(service.id) && (
                                  <CheckCircle2 className="h-3 w-3 text-white" />
                                )}
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{service.name}</p>
                                {service.isCommon && (
                                  <Badge variant="secondary" className="text-xs">
                                    Common
                                  </Badge>
                                )}
                              </div>
                              {service.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {service.description}
                                </p>
                              )}
                            </div>
                          </div>
                          {service.estimatedPrice && (
                            <p className="font-medium text-sm ml-2">
                              ₹{(service.estimatedPrice / 100).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No service templates available for this equipment type</p>
                <p className="text-sm mt-2">You can still describe your service needs below</p>
              </div>
            )}

            {/* Slot Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preferred Date *</Label>
                <Input
                  type="date"
                  value={serviceFormData.slotDate}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, slotDate: e.target.value })}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="space-y-2">
                <Label>Preferred Time *</Label>
                <Input
                  type="time"
                  value={serviceFormData.slotTime}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, slotTime: e.target.value })}
                />
              </div>
            </div>

            {/* Problem Description */}
            <div className="space-y-2">
              <Label>Problem Description</Label>
              <Textarea
                value={serviceFormData.problemDescription}
                onChange={(e) => setServiceFormData({ ...serviceFormData, problemDescription: e.target.value })}
                placeholder="Describe the issue or maintenance needed..."
                rows={4}
              />
            </div>

            {/* Summary */}
            {selectedServices.length > 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium mb-2">Selected Services ({selectedServices.length})</p>
                <ul className="text-sm space-y-1">
                  {selectedServices.map((serviceId) => {
                    const service = equipment.equipmentType?.serviceTemplates.find(s => s.id === serviceId);
                    return service ? (
                      <li key={serviceId} className="flex items-center justify-between">
                        <span>• {service.name}</span>
                        {service.estimatedPrice && (
                          <span className="text-muted-foreground">
                            ₹{(service.estimatedPrice / 100).toFixed(2)}
                          </span>
                        )}
                      </li>
                    ) : null;
                  })}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsServiceDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleServiceBooking}>
              Request Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
