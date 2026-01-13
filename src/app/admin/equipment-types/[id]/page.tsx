"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";
import { ArrowLeft, Plus, Pencil, Trash2, Settings, Wrench, Clock, Calendar } from "lucide-react";

interface ServiceTemplate {
  id: string;
  name: string;
  description: string | null;
  estimatedPrice: number | null;
  duration: number | null;
  frequency: string | null;
  isCommon: boolean;
  sortOrder: number;
}

interface PartTemplate {
  id: string;
  name: string;
  partNumber: string | null;
  description: string | null;
  estimatedPrice: number | null;
  isCommon: boolean;
  sortOrder: number;
}

interface EquipmentType {
  id: string;
  name: string;
  description: string | null;
  category: {
    id: string;
    name: string;
    icon: string | null;
  };
  serviceTemplates: ServiceTemplate[];
  partTemplates: PartTemplate[];
  _count: {
    equipmentInstances: number;
  };
}

export default function EquipmentTypeDetailPage() {
  const [equipmentType, setEquipmentType] = useState<EquipmentType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isPartDialogOpen, setIsPartDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceTemplate | null>(null);
  const [editingPart, setEditingPart] = useState<PartTemplate | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: "service" | "part"; id: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const typeId = params.id as string;

  const [serviceFormData, setServiceFormData] = useState({
    name: "",
    description: "",
    estimatedPrice: "",
    duration: "",
    frequency: "",
    isCommon: false,
    sortOrder: 0,
  });

  const [partFormData, setPartFormData] = useState({
    name: "",
    partNumber: "",
    description: "",
    estimatedPrice: "",
    isCommon: false,
    sortOrder: 0,
  });

  useEffect(() => {
    fetchEquipmentType();
  }, [typeId]);

  const fetchEquipmentType = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/equipment-types/${typeId}`);
      const data = await response.json();

      if (data.ok) {
        setEquipmentType(data.data);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch equipment type",
          variant: "destructive",
        });
        router.push("/admin/equipment-types");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch equipment type",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Service Template Handlers
  const openCreateServiceDialog = () => {
    setEditingService(null);
    setServiceFormData({
      name: "",
      description: "",
      estimatedPrice: "",
      duration: "",
      frequency: "",
      isCommon: false,
      sortOrder: equipmentType?.serviceTemplates.length || 0,
    });
    setIsServiceDialogOpen(true);
  };

  const openEditServiceDialog = (service: ServiceTemplate) => {
    setEditingService(service);
    setServiceFormData({
      name: service.name,
      description: service.description || "",
      estimatedPrice: service.estimatedPrice ? (service.estimatedPrice / 100).toString() : "",
      duration: service.duration?.toString() || "",
      frequency: service.frequency || "",
      isCommon: service.isCommon,
      sortOrder: service.sortOrder,
    });
    setIsServiceDialogOpen(true);
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!serviceFormData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Service name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const url = `/api/admin/equipment-types/${typeId}/service-templates`;
      const method = editingService ? "PATCH" : "POST";

      const payload: any = {
        name: serviceFormData.name.trim(),
        description: serviceFormData.description.trim() || undefined,
        frequency: serviceFormData.frequency.trim() || undefined,
        isCommon: serviceFormData.isCommon,
        sortOrder: serviceFormData.sortOrder,
      };

      if (editingService) {
        payload.id = editingService.id;
      }

      if (serviceFormData.estimatedPrice) {
        payload.estimatedPrice = Math.round(parseFloat(serviceFormData.estimatedPrice) * 100);
      }

      if (serviceFormData.duration) {
        payload.duration = parseInt(serviceFormData.duration);
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: editingService
            ? "Service template updated successfully"
            : "Service template created successfully",
        });
        fetchEquipmentType();
        setIsServiceDialogOpen(false);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to save service template",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save service template",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Part Template Handlers
  const openCreatePartDialog = () => {
    setEditingPart(null);
    setPartFormData({
      name: "",
      partNumber: "",
      description: "",
      estimatedPrice: "",
      isCommon: false,
      sortOrder: equipmentType?.partTemplates.length || 0,
    });
    setIsPartDialogOpen(true);
  };

  const openEditPartDialog = (part: PartTemplate) => {
    setEditingPart(part);
    setPartFormData({
      name: part.name,
      partNumber: part.partNumber || "",
      description: part.description || "",
      estimatedPrice: part.estimatedPrice ? (part.estimatedPrice / 100).toString() : "",
      isCommon: part.isCommon,
      sortOrder: part.sortOrder,
    });
    setIsPartDialogOpen(true);
  };

  const handlePartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!partFormData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Part name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const url = `/api/admin/equipment-types/${typeId}/part-templates`;
      const method = editingPart ? "PATCH" : "POST";

      const payload: any = {
        name: partFormData.name.trim(),
        partNumber: partFormData.partNumber.trim() || undefined,
        description: partFormData.description.trim() || undefined,
        isCommon: partFormData.isCommon,
        sortOrder: partFormData.sortOrder,
      };

      if (editingPart) {
        payload.id = editingPart.id;
      }

      if (partFormData.estimatedPrice) {
        payload.estimatedPrice = Math.round(parseFloat(partFormData.estimatedPrice) * 100);
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: editingPart
            ? "Part template updated successfully"
            : "Part template created successfully",
        });
        fetchEquipmentType();
        setIsPartDialogOpen(false);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to save part template",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save part template",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Handler
  const openDeleteDialog = (type: "service" | "part", id: string) => {
    setDeletingItem({ type, id });
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    try {
      const url =
        deletingItem.type === "service"
          ? `/api/admin/equipment-types/${typeId}/service-templates?templateId=${deletingItem.id}`
          : `/api/admin/equipment-types/${typeId}/part-templates?templateId=${deletingItem.id}`;

      const response = await fetch(url, { method: "DELETE" });
      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: `${deletingItem.type === "service" ? "Service" : "Part"} template deleted successfully`,
        });
        fetchEquipmentType();
        setIsDeleteDialogOpen(false);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete template",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!equipmentType) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.push("/admin/equipment-types")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Equipment Types
      </Button>

      <div className="flex items-center gap-3">
        {equipmentType.category.icon && (
          <span className="text-3xl">{equipmentType.category.icon}</span>
        )}
        <div>
          <h1 className="text-3xl font-bold">{equipmentType.name}</h1>
          <p className="text-muted-foreground">
            {equipmentType.category.name} • {equipmentType._count.equipmentInstances} equipment instances
          </p>
        </div>
      </div>

      {equipmentType.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{equipmentType.description}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services">
            <Settings className="mr-2 h-4 w-4" />
            Service Templates ({equipmentType.serviceTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="parts">
            <Wrench className="mr-2 h-4 w-4" />
            Part Templates ({equipmentType.partTemplates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Define common services for this equipment type
            </p>
            <Button onClick={openCreateServiceDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Service Template
            </Button>
          </div>

          {equipmentType.serviceTemplates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No service templates defined</p>
                <Button onClick={openCreateServiceDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Service Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {equipmentType.serviceTemplates.map((service) => (
                <Card key={service.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{service.name}</h3>
                          {service.isCommon && (
                            <Badge variant="secondary" className="text-xs">
                              Common
                            </Badge>
                          )}
                        </div>
                        {service.description && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {service.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-4 text-sm">
                          {service.estimatedPrice && (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Price:</span>
                              <span className="font-medium">
                                {formatPrice(service.estimatedPrice)}
                              </span>
                            </div>
                          )}
                          {service.duration && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">{service.duration} min</span>
                            </div>
                          )}
                          {service.frequency && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">{service.frequency}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditServiceDialog(service)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDeleteDialog("service", service.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="parts" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Define common parts for this equipment type
            </p>
            <Button onClick={openCreatePartDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Part Template
            </Button>
          </div>

          {equipmentType.partTemplates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No part templates defined</p>
                <Button onClick={openCreatePartDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Part Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {equipmentType.partTemplates.map((part) => (
                <Card key={part.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{part.name}</h3>
                          {part.isCommon && (
                            <Badge variant="secondary" className="text-xs">
                              Common
                            </Badge>
                          )}
                          {part.partNumber && (
                            <Badge variant="outline" className="text-xs font-mono">
                              {part.partNumber}
                            </Badge>
                          )}
                        </div>
                        {part.description && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {part.description}
                          </p>
                        )}
                        {part.estimatedPrice && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Price:</span>{" "}
                            <span className="font-medium">
                              {formatPrice(part.estimatedPrice)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditPartDialog(part)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDeleteDialog("part", part.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Service Template Dialog */}
      <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingService ? "Edit Service Template" : "Create Service Template"}
            </DialogTitle>
            <DialogDescription>
              {editingService
                ? "Update the service template details"
                : "Add a new service template for this equipment type"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleServiceSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="service-name">
                Service Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="service-name"
                value={serviceFormData.name}
                onChange={(e) =>
                  setServiceFormData({ ...serviceFormData, name: e.target.value })
                }
                placeholder="e.g., Oven Deep Cleaning"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-description">Description</Label>
              <Textarea
                id="service-description"
                value={serviceFormData.description}
                onChange={(e) =>
                  setServiceFormData({ ...serviceFormData, description: e.target.value })
                }
                placeholder="Brief description of the service"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="service-price">Estimated Price (₹)</Label>
                <Input
                  id="service-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={serviceFormData.estimatedPrice}
                  onChange={(e) =>
                    setServiceFormData({
                      ...serviceFormData,
                      estimatedPrice: e.target.value,
                    })
                  }
                  placeholder="1500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-duration">Duration (minutes)</Label>
                <Input
                  id="service-duration"
                  type="number"
                  min="0"
                  value={serviceFormData.duration}
                  onChange={(e) =>
                    setServiceFormData({ ...serviceFormData, duration: e.target.value })
                  }
                  placeholder="120"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-frequency">Frequency</Label>
                <Input
                  id="service-frequency"
                  value={serviceFormData.frequency}
                  onChange={(e) =>
                    setServiceFormData({ ...serviceFormData, frequency: e.target.value })
                  }
                  placeholder="Monthly"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="service-isCommon"
                checked={serviceFormData.isCommon}
                onCheckedChange={(checked) =>
                  setServiceFormData({
                    ...serviceFormData,
                    isCommon: checked as boolean,
                  })
                }
              />
              <Label htmlFor="service-isCommon" className="font-normal">
                Mark as common service (frequently performed)
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsServiceDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : editingService ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Part Template Dialog */}
      <Dialog open={isPartDialogOpen} onOpenChange={setIsPartDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPart ? "Edit Part Template" : "Create Part Template"}
            </DialogTitle>
            <DialogDescription>
              {editingPart
                ? "Update the part template details"
                : "Add a new part template for this equipment type"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePartSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="part-name">
                Part Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="part-name"
                value={partFormData.name}
                onChange={(e) =>
                  setPartFormData({ ...partFormData, name: e.target.value })
                }
                placeholder="e.g., Door Seal/Gasket"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="part-number">Part Number</Label>
              <Input
                id="part-number"
                value={partFormData.partNumber}
                onChange={(e) =>
                  setPartFormData({ ...partFormData, partNumber: e.target.value })
                }
                placeholder="e.g., SEAL-OV-001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="part-description">Description</Label>
              <Textarea
                id="part-description"
                value={partFormData.description}
                onChange={(e) =>
                  setPartFormData({ ...partFormData, description: e.target.value })
                }
                placeholder="Brief description of the part"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="part-price">Estimated Price (₹)</Label>
              <Input
                id="part-price"
                type="number"
                step="0.01"
                min="0"
                value={partFormData.estimatedPrice}
                onChange={(e) =>
                  setPartFormData({ ...partFormData, estimatedPrice: e.target.value })
                }
                placeholder="450"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="part-isCommon"
                checked={partFormData.isCommon}
                onCheckedChange={(checked) =>
                  setPartFormData({ ...partFormData, isCommon: checked as boolean })
                }
              />
              <Label htmlFor="part-isCommon" className="font-normal">
                Mark as common part (frequently replaced)
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPartDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : editingPart ? "Update" : "Create"}
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
              This will permanently delete this{" "}
              {deletingItem?.type === "service" ? "service" : "part"} template.
              This action cannot be undone.
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
