"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Calendar, CheckCircle, XCircle, Clock, Coffee } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Staff {
  id: string;
  name: string;
  designation: string;
  staffType: string;
}

interface AttendanceRecord {
  id: string;
  staffId: string;
  attendanceDate: string;
  status: "PRESENT" | "ABSENT" | "HALF_DAY" | "LEAVE" | "HOLIDAY" | "WEEKLY_OFF";
  checkInTime?: string;
  checkOutTime?: string;
  workHours?: number;
  staff: {
    id: string;
    name: string;
    designation: string;
  };
}

interface AttendanceFormData {
  [staffId: string]: {
    status: "PRESENT" | "ABSENT" | "HALF_DAY" | "LEAVE" | "HOLIDAY" | "WEEKLY_OFF" | "";
    checkInTime: string;
    checkOutTime: string;
  };
}

const attendanceStatusLabels = {
  PRESENT: "Present",
  ABSENT: "Absent",
  HALF_DAY: "Half Day",
  LEAVE: "Leave",
  HOLIDAY: "Holiday",
  WEEKLY_OFF: "Weekly Off",
};

const statusColors: Record<string, "default" | "success" | "warning" | "destructive"> = {
  PRESENT: "success",
  ABSENT: "destructive",
  HALF_DAY: "warning",
  LEAVE: "default",
  HOLIDAY: "default",
  WEEKLY_OFF: "default",
};

export default function StaffAttendancePage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceForm, setAttendanceForm] = useState<AttendanceFormData>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();
  const { selectedRestaurant } = useRestaurant();

  useEffect(() => {
    if (selectedRestaurant) {
      fetchStaff();
      fetchAttendance();
    }
  }, [selectedRestaurant, selectedDate, page]);

  const fetchStaff = async () => {
    if (!selectedRestaurant) return;

    try {
      const response = await fetch(
        `/api/owner/staff?restaurantId=${selectedRestaurant.restaurantId}&status=ACTIVE`
      );
      const data = await response.json();

      if (data.ok) {
        const staffList = Array.isArray(data.data) ? data.data : (data.data?.items || []);
        setStaff(staffList);
        // Initialize form for all staff
        const initialForm: AttendanceFormData = {};
        staffList.forEach((member: Staff) => {
          initialForm[member.id] = {
            status: "",
            checkInTime: "09:00",
            checkOutTime: "18:00",
          };
        });
        setAttendanceForm(initialForm);
      }
    } catch (error) {
      console.error("Failed to fetch staff:", error);
    }
  };

  const fetchAttendance = async () => {
    if (!selectedRestaurant) return;

    try {
      setIsLoading(true);
      const startDate = selectedDate;
      const endDate = selectedDate;

      const response = await fetch(
        `/api/owner/staff-attendance?restaurantId=${selectedRestaurant.restaurantId}&startDate=${startDate}&endDate=${endDate}&page=${page}&pageSize=20`
      );
      const data = await response.json();

      if (data.ok) {
        const items = data.data?.items || data.data;
        const total = data.data?.total || 0;
        setAttendance(Array.isArray(items) ? items : []);
        setTotalPages(Math.ceil(total / 20) || 1);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch attendance",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch attendance",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAttendance = async (staffId: string) => {
    if (!selectedRestaurant) return;

    const formData = attendanceForm[staffId];
    if (!formData || !formData.status) {
      toast({
        title: "Error",
        description: "Please select attendance status",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const checkInDateTime = formData.status === "PRESENT" || formData.status === "HALF_DAY"
        ? `${selectedDate}T${formData.checkInTime}:00`
        : undefined;

      const checkOutDateTime = formData.status === "PRESENT" || formData.status === "HALF_DAY"
        ? `${selectedDate}T${formData.checkOutTime}:00`
        : undefined;

      const response = await fetch("/api/owner/staff-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          restaurantId: selectedRestaurant.restaurantId,
          attendanceDate: selectedDate,
          status: formData.status,
          checkInTime: checkInDateTime,
          checkOutTime: checkOutDateTime,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Success",
          description: "Attendance marked successfully",
        });
        fetchAttendance();
        // Reset form for this staff
        setAttendanceForm({
          ...attendanceForm,
          [staffId]: {
            status: "",
            checkInTime: "09:00",
            checkOutTime: "18:00",
          },
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to mark attendance",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark attendance",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkMark = async (status: "PRESENT" | "ABSENT" | "WEEKLY_OFF") => {
    if (!selectedRestaurant) return;
    if (!confirm(`Mark all staff as ${attendanceStatusLabels[status]}?`)) return;

    setIsSaving(true);
    let successCount = 0;
    let errorCount = 0;

    for (const member of staff) {
      // Skip if already marked
      const existing = attendance.find((a) => a.staffId === member.id);
      if (existing) continue;

      try {
        const response = await fetch("/api/owner/staff-attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staffId: member.id,
            restaurantId: selectedRestaurant.restaurantId,
            attendanceDate: selectedDate,
            status,
            checkInTime: status === "PRESENT" ? `${selectedDate}T09:00:00` : undefined,
            checkOutTime: status === "PRESENT" ? `${selectedDate}T18:00:00` : undefined,
          }),
        });

        const data = await response.json();
        if (data.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
      }
    }

    setIsSaving(false);

    if (successCount > 0) {
      toast({
        title: "Success",
        description: `Marked ${successCount} staff member(s) as ${attendanceStatusLabels[status]}`,
      });
      fetchAttendance();
    }

    if (errorCount > 0) {
      toast({
        title: "Warning",
        description: `Failed to mark ${errorCount} staff member(s)`,
        variant: "destructive",
      });
    }
  };

  const userRole = selectedRestaurant?.role;
  const canUpdate = userRole === "OWNER" || userRole === "MANAGER";

  if (!selectedRestaurant) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a restaurant first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Staff Attendance</h1>
        <p className="text-muted-foreground">Mark and manage daily attendance</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Attendance for {formatDate(selectedDate)}</CardTitle>
              <CardDescription>
                {attendance.length} of {staff.length} staff members marked
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-auto"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {canUpdate && <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkMark("PRESENT")}
                disabled={isSaving || attendance.length === staff.length}
              >
                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                Mark All Present
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkMark("WEEKLY_OFF")}
                disabled={isSaving || attendance.length === staff.length}
              >
                <Coffee className="mr-2 h-4 w-4" />
                Mark All Weekly Off
              </Button>
            </div>}

            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading attendance...</p>
              </div>
            ) : staff.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No active staff members found</p>
              </div>
            ) : (
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Name</TableHead>
                    <TableHead>Designation</TableHead>
                    
                    <TableHead>Status</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                
                <TableBody>
                  {staff.map((member) => {
                    const existing = attendance.find((a) => a.staffId === member.id);
                    const formData = attendanceForm[member.id] || {
                      status: "",
                      checkInTime: "09:00",
                      checkOutTime: "18:00",
                    };

                    return (
                      
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell>{member.designation}</TableCell>
                        <TableCell>
                          {existing ? (
                            <Badge variant={statusColors[existing.status]}>
                              {attendanceStatusLabels[existing.status]}
                            </Badge>
                          ) : canUpdate ? (
                            <Select
                              value={formData.status}
                              onValueChange={(value: any) =>
                                setAttendanceForm({
                                  ...attendanceForm,
                                  [member.id]: { ...formData, status: value },
                                })
                              }
                            >
                              <SelectTrigger className="w-full sm:w-[140px]">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PRESENT">Present</SelectItem>
                                <SelectItem value="ABSENT">Absent</SelectItem>
                                <SelectItem value="HALF_DAY">Half Day</SelectItem>
                                <SelectItem value="LEAVE">Leave</SelectItem>
                                <SelectItem value="WEEKLY_OFF">Weekly Off</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="default">Not Marked</Badge>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          {existing ? (
                            existing.checkInTime ? (
                              new Date(existing.checkInTime).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            ) : (
                              "-"
                            )
                          ) : (formData.status === "PRESENT" || formData.status === "HALF_DAY") ? (
                            <Input
                              type="time"
                              value={formData.checkInTime}
                              onChange={(e) =>
                                setAttendanceForm({
                                  ...attendanceForm,
                                  [member.id]: { ...formData, checkInTime: e.target.value },
                                })
                              }
                              className="w-full sm:w-[120px]"
                            />
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        
                        <TableCell>
                          {existing ? (
                            existing.checkOutTime ? (
                              new Date(existing.checkOutTime).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            ) : (
                              "-"
                            )
                          ) : (formData.status === "PRESENT" || formData.status === "HALF_DAY") ? (
                            <Input
                              type="time"
                              value={formData.checkOutTime}
                              onChange={(e) =>
                                setAttendanceForm({
                                  ...attendanceForm,
                                  [member.id]: { ...formData, checkOutTime: e.target.value },
                                })
                              }
                              className="w-full sm:w-[120px]"
                            />
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        
                        <TableCell>
                          {existing ? (
                            <Badge variant="outline">Marked</Badge>
                          ) : canUpdate ? (
                            <Button
                              size="sm"
                              onClick={() => handleMarkAttendance(member.id)}
                              disabled={isSaving || !formData.status}
                            >
                              Mark
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
                        
                        
                        
                      
                
                    
              
            )}
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4 p-4">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
          <span className="flex items-center px-4 text-sm">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
        </div>
      )}
    </div>
  );
}