import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, Clock, Mail } from "lucide-react";

export default function RegisterOwnerSuccessPage() {
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <CardTitle className="text-2xl font-bold">Registration Successful!</CardTitle>
        <CardDescription className="text-base">
          Your owner account has been created and is pending approval.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-800">Pending Admin Approval</h3>
              <p className="text-sm text-amber-700 mt-1">
                Your registration is currently under review. An administrator will verify your
                details and approve your account shortly. You won&apos;t be able to log in or
                add a restaurant until then.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-800">You will be notified</h3>
              <p className="text-sm text-blue-700 mt-1">
                Once your account is approved, you will receive a notification and
                will be able to log in and add your restaurant.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            Have questions? Contact our support team for assistance.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-3">
        <Button asChild className="w-full">
          <Link href="/login">Go to Login</Link>
        </Button>
        <Button variant="outline" asChild className="w-full">
          <Link href="/">Back to Home</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
