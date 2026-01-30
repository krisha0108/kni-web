"use client";

import { useState, useEffect } from "react";
import { useRestaurant } from "@/contexts/restaurant-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { ClientOnly } from "@/components/client-only";

interface TeamMember {
  id: string;
  role: string;
  invitedAt: string;
  acceptedAt: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    isActive: boolean;
  };
  inviter: {
    id: string;
    name: string;
  };
}

export default function TeamManagementPage() {
  const { selectedRestaurant } = useRestaurant();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "MANAGER",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (selectedRestaurant) {
      fetchMembers();
    }
  }, [selectedRestaurant]);

  const fetchMembers = async () => {
    if (!selectedRestaurant) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/owner/team?restaurantId=${selectedRestaurant.restaurantId}`
      );
      const data = await response.json();

      if (data.ok) {
        setMembers(data.data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch team members",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!selectedRestaurant) return;

    try {
      const response = await fetch("/api/owner/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: selectedRestaurant.restaurantId,
          ...formData,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        toast({ title: "Success", description: "Team member invited" });
        setIsInviteOpen(false);
        resetForm();
        fetchMembers();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to invite member", variant: "destructive" });
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedMember) return;

    try {
      const response = await fetch(`/api/owner/team/${selectedMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: formData.role }),
      });

      const data = await response.json();

      if (data.ok) {
        toast({ title: "Success", description: "Role updated" });
        setIsEditOpen(false);
        setSelectedMember(null);
        fetchMembers();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update role", variant: "destructive" });
    }
  };

  const handleRemove = async () => {
    if (!selectedMember) return;

    try {
      const response = await fetch(`/api/owner/team/${selectedMember.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.ok) {
        toast({ title: "Success", description: "Member removed" });
        setIsDeleteOpen(false);
        setSelectedMember(null);
        fetchMembers();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to remove member", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({ name: "", email: "", phone: "", role: "MANAGER" });
  };

  const openEditDialog = (member: TeamMember) => {
    setSelectedMember(member);
    setFormData({ ...formData, role: member.role });
    setIsEditOpen(true);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-IN");
  };

  if (!selectedRestaurant) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">Please select a restaurant</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground">
            Invite and manage team members for {selectedRestaurant.restaurant.name}
          </p>
        </div>
        <Button onClick={() => setIsInviteOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : members.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">No team members yet</p>
            <p className="text-sm text-muted-foreground">Invite members to collaborate</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Manage access and roles for your restaurant</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited By</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.user.name}</TableCell>
                    <TableCell>{member.user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{member.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.acceptedAt ? "default" : "secondary"}>
                        {member.acceptedAt ? "Active" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>{member.inviter.name}</TableCell>
                    <TableCell>
                      {formatDate(member.acceptedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(member)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedMember(member);
                            setIsDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Invite Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Invite a new member to collaborate on {selectedRestaurant.restaurant.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 9876543210"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <ClientOnly>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                    <SelectItem value="VIEWER">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </ClientOnly>
              <p className="text-xs text-muted-foreground">
                Manager: Full access except team management<br />
                Accountant: Can manage expenses and view reports<br />
                Viewer: Read-only access
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite}>Send Invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedMember?.user.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role *</Label>
              <ClientOnly>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                    <SelectItem value="VIEWER">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </ClientOnly>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole}>Update Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedMember?.user.name} from the team?
              They will lose access to all restaurant data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
