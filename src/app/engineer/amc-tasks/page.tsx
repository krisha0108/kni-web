"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2, MapPin, Calendar, ArrowRight, CheckCircle, Phone, Wrench } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface TaskItem {
  id: string;
  type: "SURVEY" | "VISIT";
  restaurantName: string;
  restaurantAddress: string;
  restaurantCity: string;
  ownerName: string;
  ownerPhone: string;
  scheduledDate: string;
  status: string;
  completedDate: string | null;
  // Survey specific
  planType?: string;
  kitchenType?: string;
  overallCondition?: string | null;
  // Visit specific
  visitNumber?: number;
  contractNumber?: string;
}

const statusColors: Record<string, "default" | "warning" | "success" | "destructive"> = {
  SCHEDULED: "warning",
  ASSIGNED: "warning",
  IN_PROGRESS: "default",
  COMPLETED: "success",
  CANCELLED: "destructive",
  MISSED: "destructive",
};

export default function EngineerAMCTasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const fetchTasks = async () => {
    try {
      const [surveysRes, visitsRes] = await Promise.all([
        fetch("/api/engineer/amc-surveys").then((r) => r.json()),
        fetch("/api/engineer/amc-visits").then((r) => r.json()),
      ]);

      const allTasks: TaskItem[] = [];

      if (surveysRes.ok) {
        for (const s of surveysRes.data) {
          allTasks.push({
            id: s.id,
            type: "SURVEY",
            restaurantName: s.request.restaurant.name,
            restaurantAddress: s.request.restaurant.address,
            restaurantCity: s.request.restaurant.city,
            ownerName: s.request.owner.name,
            ownerPhone: s.request.owner.phone,
            scheduledDate: s.scheduledDate,
            status: s.status,
            completedDate: s.completedDate,
            planType: s.request.planType,
            kitchenType: s.request.kitchenType,
            overallCondition: s.overallCondition,
          });
        }
      }

      if (visitsRes.ok) {
        for (const v of visitsRes.data) {
          allTasks.push({
            id: v.id,
            type: "VISIT",
            restaurantName: v.contract.restaurant.name,
            restaurantAddress: v.contract.restaurant.address,
            restaurantCity: v.contract.restaurant.city,
            ownerName: v.contract.owner.name,
            ownerPhone: v.contract.owner.phone,
            scheduledDate: v.scheduledDate,
            status: v.status,
            completedDate: v.completedDate,
            visitNumber: v.visitNumber,
            contractNumber: v.contract.contractNumber,
          });
        }
      }

      setTasks(allTasks);
    } catch {
      toast({ title: "Error", description: "Failed to load tasks", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleAccept = async (task: TaskItem) => {
    setAcceptingId(task.id);
    const url = task.type === "SURVEY"
      ? `/api/engineer/amc-surveys/${task.id}/accept`
      : `/api/engineer/amc-visits/${task.id}/accept`;
    try {
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Accepted!", description: task.type === "SURVEY" ? "You can now start the survey" : "You can now start the visit" });
        fetchTasks();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to accept", variant: "destructive" });
    } finally {
      setAcceptingId(null);
    }
  };

  const handleStart = (task: TaskItem) => {
    if (task.type === "SURVEY") {
      router.push(`/engineer/amc-surveys/${task.id}`);
    } else {
      router.push(`/engineer/amc-visits/${task.id}`);
    }
  };

  const needsAccept = tasks.filter((t) => t.status === "SCHEDULED" || t.status === "ASSIGNED");
  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS");
  const completed = tasks.filter((t) => t.status === "COMPLETED");

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const renderTask = (task: TaskItem, showActions: "accept" | "start" | "none") => (
    <Card key={`${task.type}-${task.id}`} className={
      showActions === "accept" ? "border-yellow-200 bg-yellow-50/30" :
      showActions === "start" ? "border-blue-200 bg-blue-50/30" : "opacity-75"
    }>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={task.type === "SURVEY" ? "bg-purple-100 text-purple-800 border-purple-300" : "bg-blue-100 text-blue-800 border-blue-300"}>
                {task.type === "SURVEY" ? <><Shield className="h-3 w-3 mr-1" />Survey</> : <><Wrench className="h-3 w-3 mr-1" />Visit #{task.visitNumber}</>}
              </Badge>
            </div>
            <p className="font-medium text-lg">{task.restaurantName}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />{task.restaurantAddress}, {task.restaurantCity}
            </p>
            <p className="text-sm flex items-center gap-1">
              <Calendar className="h-3 w-3" />{formatDate(task.scheduledDate)}
            </p>
            <p className="text-sm flex items-center gap-1">
              <Phone className="h-3 w-3" />{task.ownerName} ({task.ownerPhone})
            </p>
            {task.type === "SURVEY" && task.planType && (
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="text-xs">{task.planType}</Badge>
                <Badge variant="outline" className="text-xs">{task.kitchenType}</Badge>
              </div>
            )}
            {task.type === "VISIT" && task.contractNumber && (
              <p className="text-xs text-muted-foreground">Contract: {task.contractNumber}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={statusColors[task.status]}>{task.status}</Badge>
            {showActions === "accept" && (
              <Button size="sm" onClick={() => handleAccept(task)} disabled={acceptingId === task.id}>
                {acceptingId === task.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle className="mr-1 h-3 w-3" />}
                Accept
              </Button>
            )}
            {showActions === "start" && (
              <Button size="sm" onClick={() => handleStart(task)}>
                {task.type === "SURVEY" ? "Start Survey" : "Start Visit"} <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            )}
            {showActions === "none" && task.completedDate && (
              <span className="text-xs text-muted-foreground">{formatDate(task.completedDate)}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" /> AMC Tasks
        </h1>
        <p className="text-muted-foreground">Your surveys and preventive maintenance visits</p>
      </div>

      {tasks.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">No tasks assigned</p>
        </CardContent></Card>
      ) : (
        <>
          {needsAccept.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">New Assignments ({needsAccept.length})</h2>
              {needsAccept.map((t) => renderTask(t, "accept"))}
            </div>
          )}

          {inProgress.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">In Progress ({inProgress.length})</h2>
              {inProgress.map((t) => renderTask(t, "start"))}
            </div>
          )}

          {completed.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Completed ({completed.length})</h2>
              {completed.map((t) => renderTask(t, "none"))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
