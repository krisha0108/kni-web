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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientOnly } from "@/components/client-only";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, CheckCircle2, XCircle, Clock, FileText, Image as ImageIcon, Shield, Wrench, IndianRupee, AlertCircle, Building2, Pencil, ExternalLink, Upload, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getWarrantyStatus, getEquipmentStatusColor, getEquipmentStatusLabel } from "@/lib/equipment";
import { getAMCDurationLabel, getAMCStatusColor, getAMCStatusLabel, getAMCSourceLabel, getAMCSourceColor } from "@/lib/amc";
import { useRestaurant } from "@/contexts/restaurant-context";

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
  source: "INTERNAL" | "EXTERNAL";
  providerName: string | null;
  providerContact: string | null;
  contractNumber: string | null;
  documentUrl: string | null;
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
  const [cancelAmcId, setCancelAmcId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const { selectedRestaurant } = useRestaurant();
  const userRole = selectedRestaurant?.role;
  const canManage = userRole === "OWNER" || userRole === "MANAGER";

  const [amcFormData, setAmcFormData] = useState({
    planName: "",
    planDescription: "",
    duration: "YEARLY" as string,
    serviceLimit: 1,
    featuresJson: [] as string[],
    totalAmount: 0,
    startDate: "",
    providerName: "",
    providerContact: "",
    contractNumber: "",
    documentUrl: "",
  });

  // Edit external AMC state
  const [isEditAmcOpen, setIsEditAmcOpen] = useState(false);
  const [editingAmc, setEditingAmc] = useState<AMCSubscription | null>(null);
  const [editAmcData, setEditAmcData] = useState({
    planName: "",
    planDescription: "",
    providerName: "",
    providerContact: "",
    contractNumber: "",
    documentUrl: "",
    totalAmount: 0,
    featuresJson: [] as string[],
  });
  const [editFeatureInput, setEditFeatureInput] = useState("");

  // Log service state
  const [isLogServiceOpen, setIsLogServiceOpen] = useState(false);
  const [logServiceAmcId, setLogServiceAmcId] = useState<string | null>(null);
  const [logServiceData, setLogServiceData] = useState({
    serviceDate: "",
    serviceType: "",
    notes: "",
  });

  const [isUploading, setIsUploading] = useState(false);

  const [featureInput, setFeatureInput] = useState("");

  // Service booking state
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [availableServices, setAvailableServices] = useState<ServiceTemplate[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
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

  const resetAmcForm = () => {
    setAmcFormData({
      planName: "",
      planDescription: "",
      duration: "YEARLY",
      serviceLimit: 1,
      featuresJson: [],
      totalAmount: 0,
      startDate: "",
      providerName: "",
      providerContact: "",
      contractNumber: "",
      documentUrl: "",
    });
    setFeatureInput("");
  };

  const handleCreateAmc = async () => {
    try {
      if (!amcFormData.providerName || !amcFormData.planName || !amcFormData.startDate) {
        toast({
          title: "Error",
          description: "Provider name, plan name and start date are required",
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
          totalAmount: amcFormData.totalAmount,
          startDate: new Date(amcFormData.startDate).toISOString(),
          autoRenew: false,
          source: "EXTERNAL",
          providerName: amcFormData.providerName,
          providerContact: amcFormData.providerContact || undefined,
          contractNumber: amcFormData.contractNumber || undefined,
          documentUrl: amcFormData.documentUrl || undefined,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: "AMC subscription created successfully",
        });
        setIsCreateAmcOpen(false);
        resetAmcForm();
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

  const handleEditAmc = (amc: AMCSubscription) => {
    setEditingAmc(amc);
    setEditAmcData({
      planName: amc.planName || "",
      planDescription: amc.planDescription || "",
      providerName: amc.providerName || "",
      providerContact: amc.providerContact || "",
      contractNumber: amc.contractNumber || "",
      documentUrl: amc.documentUrl || "",
      totalAmount: amc.totalAmount,
      featuresJson: amc.featuresJson || [],
    });
    setEditFeatureInput("");
    setIsEditAmcOpen(true);
  };

  const handleUpdateAmc = async () => {
    if (!editingAmc) return;

    try {
      const response = await fetch(`/api/owner/equipment/${resolvedParams.id}/amc/${editingAmc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planName: editAmcData.planName || undefined,
          planDescription: editAmcData.planDescription || undefined,
          providerName: editAmcData.providerName || undefined,
          providerContact: editAmcData.providerContact || undefined,
          contractNumber: editAmcData.contractNumber || undefined,
          documentUrl: editAmcData.documentUrl || undefined,
          totalAmount: editAmcData.totalAmount,
          featuresJson: editAmcData.featuresJson,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: "AMC subscription updated successfully",
        });
        setIsEditAmcOpen(false);
        setEditingAmc(null);
        fetchAmcSubscriptions();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update AMC subscription",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update AMC subscription",
        variant: "destructive",
      });
    }
  };

  const handleDocumentUpload = async (
    file: File,
    onSuccess: (url: string) => void
  ) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "amc-documents");

      const response = await fetch("/api/upload-document", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.ok) {
        onSuccess(data.url);
        toast({ title: "Success", description: "Document uploaded" });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to upload document",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const openLogService = (amcId: string) => {
    setLogServiceAmcId(amcId);
    setLogServiceData({
      serviceDate: new Date().toISOString().split("T")[0],
      serviceType: "",
      notes: "",
    });
    setIsLogServiceOpen(true);
  };

  const handleLogService = async () => {
    if (!logServiceAmcId) return;

    if (!logServiceData.serviceDate || !logServiceData.serviceType) {
      toast({
        title: "Error",
        description: "Service date and type are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/owner/equipment/${resolvedParams.id}/amc/${logServiceAmcId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceDate: new Date(logServiceData.serviceDate).toISOString(),
          serviceType: logServiceData.serviceType,
          notes: logServiceData.notes || undefined,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: "Service logged successfully",
        });
        setIsLogServiceOpen(false);
        setLogServiceAmcId(null);
        fetchAmcSubscriptions();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to log service",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log service",
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

  const openServiceDialog = async () => {
    setSelectedServices([]);
    setServiceFormData({ slotDate: "", slotTime: "", problemDescription: "" });
    setIsServiceDialogOpen(true);
    setIsLoadingServices(true);
    try {
      const response = await fetch("/api/owner/service-templates");
      const data = await response.json();
      setAvailableServices(data.ok ? data.data : []);
    } catch (error) {
      setAvailableServices([]);
    } finally {
      setIsLoadingServices(false);
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
  const activeAmcs = amcSubscriptions.filter(amc => amc.status === "ACTIVE");
  const activeAmc = activeAmcs.length > 0 ? activeAmcs[0] : null;
  const photoUrls = Array.isArray(equipment.photoUrls) ? equipment.photoUrls : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/owner/equipment")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{equipment.name}</h1>
            <p className="text-muted-foreground">
              {typeof equipment.category === 'object' && equipment.category !== null ? (equipment.category as { name?: string }).name : equipment.category}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canManage && (
            <Button size="sm" onClick={openServiceDialog}>
              <Wrench className="mr-2 h-4 w-4" />
              Request Service
            </Button>
          )}
          <Badge variant={getEquipmentStatusColor(equipment.status)}>
            {getEquipmentStatusLabel(equipment.status)}
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed Services</p>
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
                <p className="text-xl font-bold">₹{(equipment.totalSpend || 0).toLocaleString()}</p>
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
                <p className="text-xl font-bold">{activeAmcs.length > 0 ? `${activeAmcs.length} Active` : "None"}</p>
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
                      <img src={equipment.billImageUrl} alt="Bill" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
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
                      <img src={equipment.warrantyCardUrl} alt="Warranty Card" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {photoUrls.map((url, index) => (
                      <div
                        key={index}
                        className="relative aspect-square rounded-lg border overflow-hidden cursor-pointer hover:opacity-80 transition"
                        onClick={() => setSelectedImage(url)}
                      >
                        <img src={url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
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

          {/* AMC Subscriptions */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  AMC Subscriptions
                </CardTitle>
                {canManage && <Dialog open={isCreateAmcOpen} onOpenChange={setIsCreateAmcOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add External AMC
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
                    <DialogHeader>
                      <DialogTitle>Add External AMC</DialogTitle>
                      <DialogDescription>
                        Track an AMC contract from a third-party provider for this equipment
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {/* Provider Details */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Provider Name *</Label>
                          <Input
                            value={amcFormData.providerName}
                            onChange={(e) => setAmcFormData({ ...amcFormData, providerName: e.target.value })}
                            placeholder="e.g., Voltas, Blue Star"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Provider Contact</Label>
                          <Input
                            value={amcFormData.providerContact}
                            onChange={(e) => setAmcFormData({ ...amcFormData, providerContact: e.target.value })}
                            placeholder="Phone or email"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Plan Name *</Label>
                        <Input
                          value={amcFormData.planName}
                          onChange={(e) => setAmcFormData({ ...amcFormData, planName: e.target.value })}
                          placeholder="e.g., Annual Maintenance Plan"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={amcFormData.planDescription}
                          onChange={(e) => setAmcFormData({ ...amcFormData, planDescription: e.target.value })}
                          placeholder="Describe what's included in this AMC..."
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Contract Number</Label>
                        <Input
                          value={amcFormData.contractNumber}
                          onChange={(e) => setAmcFormData({ ...amcFormData, contractNumber: e.target.value })}
                          placeholder="e.g., AMC-2026-001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Upload Document</Label>
                        {amcFormData.documentUrl ? (
                          <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <a href={amcFormData.documentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate flex-1">
                              {amcFormData.documentUrl.split("/").pop()}
                            </a>
                            <button
                              type="button"
                              onClick={() => setAmcFormData({ ...amcFormData, documentUrl: "" })}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-md cursor-pointer hover:border-primary/50 transition">
                            {isUploading ? (
                              <><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm text-muted-foreground">Uploading...</span></>
                            ) : (
                              <><Upload className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Click to upload (PDF, Image - max 10MB)</span></>
                            )}
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png,.webp"
                              disabled={isUploading}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleDocumentUpload(file, (url) => setAmcFormData({ ...amcFormData, documentUrl: url }));
                                }
                                e.target.value = "";
                              }}
                            />
                          </label>
                        )}
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
                          <Label>Service Limit</Label>
                          <Input
                            type="number"
                            min="0"
                            value={amcFormData.serviceLimit}
                            onChange={(e) => setAmcFormData({ ...amcFormData, serviceLimit: parseInt(e.target.value) || 0 })}
                            placeholder="0 for unlimited"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Amount (₹)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={amcFormData.totalAmount}
                            onChange={(e) => setAmcFormData({ ...amcFormData, totalAmount: parseInt(e.target.value) || 0 })}
                            placeholder="0"
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
                        <Label>Features / Coverage</Label>
                        <div className="flex gap-2">
                          <Input
                            value={featureInput}
                            onChange={(e) => setFeatureInput(e.target.value)}
                            placeholder="Add a feature or coverage item"
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
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateAmcOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateAmc}>Add External AMC</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>}
              </div>
            </CardHeader>
            <CardContent>
              {amcSubscriptions.length > 0 ? (
                <div className="space-y-4">
                  {amcSubscriptions.map((amc) => {
                    const daysRemaining = Math.ceil((new Date(amc.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    const usagePercent = amc.serviceLimit > 0 ? (amc.servicesUsed / amc.serviceLimit) * 100 : 0;
                    const isExternal = amc.source === "EXTERNAL";
                    return (
                      <div
                        key={amc.id}
                        className={`border rounded-lg p-4 ${amc.status === "ACTIVE" ? `border-l-4 ${isExternal ? "border-l-blue-500" : "border-l-green-500"}` : ""}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{amc.planName || "Custom Plan"}</p>
                              <Badge variant={isExternal ? "secondary" : "default"} className="text-xs">
                                {isExternal ? (
                                  <><Building2 className="h-3 w-3 mr-1" />External</>
                                ) : (
                                  <><Shield className="h-3 w-3 mr-1" />KNI Platform</>
                                )}
                              </Badge>
                            </div>
                            {amc.planDescription && (
                              <p className="text-sm text-muted-foreground">{amc.planDescription}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isExternal && canManage && amc.status === "ACTIVE" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditAmc(amc)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            <Badge variant={amc.status === "ACTIVE" ? "success" : amc.status === "EXPIRED" ? "destructive" : "secondary"}>
                              {amc.status}
                            </Badge>
                          </div>
                        </div>

                        {/* External provider info */}
                        {isExternal && amc.providerName && (
                          <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-md text-sm">
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              <span><span className="text-muted-foreground">Provider:</span> <span className="font-medium">{amc.providerName}</span></span>
                              {amc.providerContact && (
                                <span><span className="text-muted-foreground">Contact:</span> {amc.providerContact}</span>
                              )}
                              {amc.contractNumber && (
                                <span><span className="text-muted-foreground">Contract #:</span> <span className="font-mono">{amc.contractNumber}</span></span>
                              )}
                              {amc.documentUrl && (
                                <a href={amc.documentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                  <ExternalLink className="h-3 w-3" />View Document
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                          <div>
                            <p className="text-muted-foreground">Duration</p>
                            <p className="font-medium">{getAMCDurationLabel(amc.duration as any)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Amount</p>
                            <p className="font-medium">₹{amc.totalAmount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Period</p>
                            <p className="font-medium">{formatDate(amc.startDate)} - {formatDate(amc.endDate)}</p>
                          </div>
                          {!isExternal && (
                            <div>
                              <p className="text-muted-foreground">Auto-Renew</p>
                              <p className="font-medium">{amc.autoRenew ? "Yes" : "No"}</p>
                            </div>
                          )}
                        </div>
                        {amc.status === "ACTIVE" && (
                          <>
                            {amc.serviceLimit > 0 && (
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
                            )}
                            {amc.serviceLimit === 0 && (
                              <div className="mb-3">
                                <p className="text-xs text-muted-foreground">
                                  Unlimited services • {daysRemaining > 0 ? `${daysRemaining} days left` : "Expired"}
                                </p>
                              </div>
                            )}
                            {canManage && (
                              <div className="flex flex-wrap gap-2">
                                {isExternal && (amc.serviceLimit === 0 || amc.servicesUsed < amc.serviceLimit) && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => openLogService(amc.id)}
                                  >
                                    <Plus className="mr-1 h-3 w-3" />
                                    Log Service
                                  </Button>
                                )}
                                {!isExternal && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleToggleAutoRenew(amc.id, amc.autoRenew)}
                                  >
                                    {amc.autoRenew ? "Disable Auto-Renew" : "Enable Auto-Renew"}
                                  </Button>
                                )}
                                {userRole === "OWNER" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => setCancelAmcId(amc.id)}
                                  >
                                    Cancel AMC
                                  </Button>
                                )}
                              </div>
                            )}
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
                        {/* Service Usage History */}
                        {isExternal && amc.usageLogs && amc.usageLogs.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm font-medium mb-2">Service History</p>
                            <div className="space-y-2">
                              {amc.usageLogs.map((log) => (
                                <div key={log.id} className="flex items-start justify-between text-sm p-2 bg-muted/50 rounded">
                                  <div>
                                    <p className="font-medium">{log.serviceType}</p>
                                    {log.notes && <p className="text-xs text-muted-foreground">{log.notes}</p>}
                                  </div>
                                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">{formatDate(log.serviceDate)}</span>
                                </div>
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
                  <p className="text-sm mt-1">Add an external AMC to track third-party maintenance contracts</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Image Preview Dialog */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Image Preview</DialogTitle>
              <DialogDescription>
                Full-size view of the image
              </DialogDescription>
            </DialogHeader>
            <img src={selectedImage} alt="Preview" className="w-full h-auto" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </DialogContent>
        </Dialog>
      )}

      {/* Service Booking Dialog */}
      <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Request Service for {equipment.name}</DialogTitle>
            <DialogDescription>
              Select services and schedule a time for maintenance
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Available Services */}
            {isLoadingServices ? (
              <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
                <p>Loading services...</p>
              </div>
            ) : availableServices.length > 0 ? (
              <div className="space-y-3">
                <Label className="text-base font-semibold">Available Services</Label>
                <div className="space-y-2">
                  {availableServices.map((service) => (
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
                              ₹{service.estimatedPrice.toLocaleString()}
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
                    const service = availableServices.find(s => s.id === serviceId);
                    return service ? (
                      <li key={serviceId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <span>• {service.name}</span>
                        {service.estimatedPrice && (
                          <span className="text-muted-foreground">
                            ₹{service.estimatedPrice.toLocaleString()}
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

      {/* Edit External AMC Dialog */}
      <Dialog open={isEditAmcOpen} onOpenChange={setIsEditAmcOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Edit AMC Details</DialogTitle>
            <DialogDescription>
              Update the details of this external AMC subscription
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Plan Name</Label>
              <Input
                value={editAmcData.planName}
                onChange={(e) => setEditAmcData({ ...editAmcData, planName: e.target.value })}
                placeholder="Plan name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editAmcData.planDescription}
                onChange={(e) => setEditAmcData({ ...editAmcData, planDescription: e.target.value })}
                placeholder="Plan description"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Provider Name</Label>
                <Input
                  value={editAmcData.providerName}
                  onChange={(e) => setEditAmcData({ ...editAmcData, providerName: e.target.value })}
                  placeholder="Provider name"
                />
              </div>
              <div className="space-y-2">
                <Label>Provider Contact</Label>
                <Input
                  value={editAmcData.providerContact}
                  onChange={(e) => setEditAmcData({ ...editAmcData, providerContact: e.target.value })}
                  placeholder="Phone or email"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contract Number</Label>
                <Input
                  value={editAmcData.contractNumber}
                  onChange={(e) => setEditAmcData({ ...editAmcData, contractNumber: e.target.value })}
                  placeholder="Contract #"
                />
              </div>
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={editAmcData.totalAmount}
                  onChange={(e) => setEditAmcData({ ...editAmcData, totalAmount: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Upload Document</Label>
              {editAmcData.documentUrl ? (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <a href={editAmcData.documentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate flex-1">
                    {editAmcData.documentUrl.split("/").pop()}
                  </a>
                  <button
                    type="button"
                    onClick={() => setEditAmcData({ ...editAmcData, documentUrl: "" })}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-md cursor-pointer hover:border-primary/50 transition">
                  {isUploading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm text-muted-foreground">Uploading...</span></>
                  ) : (
                    <><Upload className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Click to upload (PDF, Image - max 10MB)</span></>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    disabled={isUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleDocumentUpload(file, (url) => setEditAmcData({ ...editAmcData, documentUrl: url }));
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            <div className="space-y-2">
              <Label>Features</Label>
              <div className="flex gap-2">
                <Input
                  value={editFeatureInput}
                  onChange={(e) => setEditFeatureInput(e.target.value)}
                  placeholder="Add a feature"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (editFeatureInput.trim()) {
                        setEditAmcData({ ...editAmcData, featuresJson: [...editAmcData.featuresJson, editFeatureInput.trim()] });
                        setEditFeatureInput("");
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={() => {
                    if (editFeatureInput.trim()) {
                      setEditAmcData({ ...editAmcData, featuresJson: [...editAmcData.featuresJson, editFeatureInput.trim()] });
                      setEditFeatureInput("");
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {editAmcData.featuresJson.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {editAmcData.featuresJson.map((feature, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {feature}
                      <button
                        onClick={() => setEditAmcData({ ...editAmcData, featuresJson: editAmcData.featuresJson.filter((_, i) => i !== index) })}
                        className="ml-1 hover:text-destructive"
                      >
                        <XCircle className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditAmcOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAmc}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Service Dialog */}
      <Dialog open={isLogServiceOpen} onOpenChange={setIsLogServiceOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Log Service Usage</DialogTitle>
            <DialogDescription>
              Record a service that was performed under this AMC
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Service Date *</Label>
              <Input
                type="date"
                value={logServiceData.serviceDate}
                onChange={(e) => setLogServiceData({ ...logServiceData, serviceDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Service Type *</Label>
              <Select
                value={logServiceData.serviceType}
                onValueChange={(value) => setLogServiceData({ ...logServiceData, serviceType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Preventive Maintenance">Preventive Maintenance</SelectItem>
                  <SelectItem value="Breakdown Repair">Breakdown Repair</SelectItem>
                  <SelectItem value="Routine Inspection">Routine Inspection</SelectItem>
                  <SelectItem value="Parts Replacement">Parts Replacement</SelectItem>
                  <SelectItem value="Deep Cleaning">Deep Cleaning</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={logServiceData.notes}
                onChange={(e) => setLogServiceData({ ...logServiceData, notes: e.target.value })}
                placeholder="What was done during this service..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLogServiceOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLogService}>Log Service</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!cancelAmcId} onOpenChange={(open) => !open && setCancelAmcId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel AMC Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this AMC subscription? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cancelAmcId) handleCancelAmc(cancelAmcId);
                setCancelAmcId(null);
              }}
            >
              Cancel AMC
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}