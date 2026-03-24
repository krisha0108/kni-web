"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Image, MessageSquare, BookOpen, Megaphone, BarChart3, Sparkles, Clock } from "lucide-react";
import Link from "next/link";

export default function ContentManagementPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Mobile App Content Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage banners, feeds, guides, and sponsored content for your mobile applications
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Banners */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <Image className="h-8 w-8 text-primary" />
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/content/banners">
                  Manage
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <CardTitle>Banners</CardTitle>
            <CardDescription>
              Hero banners for mobile app home screen carousel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Publish/Draft/Archive status</li>
              <li>• Auto-scheduling with start/end dates</li>
              <li>• Custom sort order</li>
              <li>• Image upload support</li>
              <li>• Bulk operations</li>
            </ul>
          </CardContent>
        </Card>

        {/* Feeds */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <MessageSquare className="h-8 w-8 text-primary" />
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/content/feeds">
                  Manage
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <CardTitle>Feeds</CardTitle>
            <CardDescription>
              News and announcement feeds with tone indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• 4 tone types: OK, INFO, WARN, DANGER</li>
              <li>• Custom icons support</li>
              <li>• Active/inactive toggle</li>
              <li>• Link to external content</li>
              <li>• Real-time updates</li>
            </ul>
          </CardContent>
        </Card>

        {/* Guides */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <BookOpen className="h-8 w-8 text-primary" />
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/content/guides">
                  Manage
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <CardTitle>Guides</CardTitle>
            <CardDescription>
              Tutorial guides and videos for user education
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Video/tutorial links</li>
              <li>• Thumbnail images</li>
              <li>• Duration tracking (minutes)</li>
              <li>• Custom sort order</li>
              <li>• Active/inactive status</li>
            </ul>
          </CardContent>
        </Card>

        {/* Sponsored Content */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <Megaphone className="h-8 w-8 text-primary" />
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/content/sponsored">
                  Manage
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <CardTitle>Sponsored Content</CardTitle>
            <CardDescription>
              Sponsored campaigns with analytics tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• 4 types: Vendor, Product, Service, General</li>
              <li>• Campaign date ranges</li>
              <li>• Impressions & clicks tracking</li>
              <li>• CTR analytics</li>
              <li>• Auto-activation/deactivation</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <CardTitle className="text-lg">Analytics Dashboard</CardTitle>
            <CardDescription>
              View performance metrics and insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/admin/content/analytics">
                View Analytics
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardHeader>
            <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            <CardTitle className="text-lg">Content Templates</CardTitle>
            <CardDescription>
              Quick create from predefined templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/admin/content/templates">
                Browse Templates
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardHeader>
            <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />
            <CardTitle className="text-lg">Auto-Scheduling</CardTitle>
            <CardDescription>
              Automated content publishing system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="outline">
              <Link href="/admin/content/schedule">
                View Schedule
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Features Summary */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>System Features</CardTitle>
          <CardDescription>What you can do with the content management system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Content Management</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Full CRUD operations</li>
                <li>✓ Image upload support</li>
                <li>✓ Status management</li>
                <li>✓ Search and filtering</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Automation</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Auto-publish on start date</li>
                <li>✓ Auto-archive on end date</li>
                <li>✓ Bulk operations</li>
                <li>✓ Content templates</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Analytics</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Impressions tracking</li>
                <li>✓ Click tracking</li>
                <li>✓ CTR calculation</li>
                <li>✓ Performance insights</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}