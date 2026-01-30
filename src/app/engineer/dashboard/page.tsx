import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ClipboardList, Clock, CheckCircle, XCircle } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default async function EngineerDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [pendingJobs, acceptedJobs, completedJobs, recentAssignments] = await Promise.all([
    db.engineerAssignment.count({
      where: { engineerId: session.id, status: "PENDING" },
    }),
    db.engineerAssignment.count({
      where: { engineerId: session.id, status: "ACCEPTED" },
    }),
    db.engineerAssignment.count({
      where: { engineerId: session.id, status: "COMPLETED" },
    }),
    db.engineerAssignment.findMany({
      where: { engineerId: session.id },
      include: {
        booking: {
          include: {
            restaurant: true,
          },
        },
      },
      orderBy: { assignedAt: "desc" },
      take: 5,
    }),
  ]);

  const statusColors: Record<string, "default" | "secondary" | "destructive" | "success" | "warning"> = {
    PENDING: "warning",
    ACCEPTED: "default",
    REJECTED: "destructive",
    COMPLETED: "success",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Engineer Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.name}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Jobs</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingJobs}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting your response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted Jobs</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{acceptedJobs}</div>
            <p className="text-xs text-muted-foreground">
              In progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedJobs}</div>
            <p className="text-xs text-muted-foreground">
              Successfully finished
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">View All Jobs</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button size="sm" asChild>
              <Link href="/engineer/jobs">View Jobs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {recentAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Assignments</CardTitle>
            <CardDescription>Your latest job assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">
                      {assignment.booking.restaurant.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {assignment.booking.slotStartDateTime
                        ? formatDateTime(assignment.booking.slotStartDateTime)
                        : "No slot"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusColors[assignment.status]}>
                      {assignment.status}
                    </Badge>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/engineer/jobs/${assignment.id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
