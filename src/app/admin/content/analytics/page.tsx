"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3,
  TrendingUp,
  Eye,
  MousePointerClick,
  Image,
  MessageSquare,
  BookOpen,
  Megaphone,
  Calendar,
  Activity,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Analytics {
  overview: {
    banners: { total: number; published: number; draft: number; archived: number };
    feeds: { total: number; active: number; inactive: number };
    guides: { total: number; active: number; inactive: number };
    sponsored: { total: number; active: number; expired: number };
  };
  performance: {
    sponsored: {
      topPerforming: Array<{
        id: string;
        title: string;
        type: string;
        impressions: number;
        clicks: number;
        ctr: string;
        sponsoredBy: string;
      }>;
      totalImpressions: number;
      totalClicks: number;
      overallCTR: string;
    };
  };
  recent: {
    banners: Array<any>;
    feeds: Array<any>;
    guides: Array<any>;
  };
  insights: {
    feedsByTone: Array<{ tone: string; count: number }>;
  };
  trends: {
    last30Days: {
      banners: number;
      feeds: number;
      guides: number;
      sponsored: number;
    };
  };
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/content/analytics?days=30");
      const data = await response.json();
      if (data.ok) {
        setAnalytics(data.data);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch analytics",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch analytics",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">No analytics data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          Content Analytics Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Performance metrics and insights for mobile app content
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Banners</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.banners.total}</div>
            <div className="flex gap-2 mt-2 text-xs">
              <Badge variant="default">{analytics.overview.banners.published} Published</Badge>
              <Badge variant="secondary">{analytics.overview.banners.draft} Draft</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feeds</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.feeds.total}</div>
            <div className="flex gap-2 mt-2 text-xs">
              <Badge variant="default">{analytics.overview.feeds.active} Active</Badge>
              <Badge variant="outline">{analytics.overview.feeds.inactive} Inactive</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Guides</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.guides.total}</div>
            <div className="flex gap-2 mt-2 text-xs">
              <Badge variant="default">{analytics.overview.guides.active} Active</Badge>
              <Badge variant="outline">{analytics.overview.guides.inactive} Inactive</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sponsored</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.sponsored.total}</div>
            <div className="flex gap-2 mt-2 text-xs">
              <Badge variant="default">{analytics.overview.sponsored.active} Active</Badge>
              <Badge variant="outline">{analytics.overview.sponsored.expired} Expired</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sponsored Content Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Total Impressions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {analytics.performance.sponsored.totalImpressions.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all active sponsored content
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MousePointerClick className="h-4 w-4" />
              Total Clicks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {analytics.performance.sponsored.totalClicks.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              User engagement with sponsored content
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Overall CTR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.performance.sponsored.overallCTR}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Click-through rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Sponsored Content */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Top Performing Sponsored Content</CardTitle>
          <CardDescription>
            Best performing campaigns by impressions and clicks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Sponsor</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">CTR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.performance.sponsored.topPerforming.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.type}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.sponsoredBy}
                  </TableCell>
                  <TableCell className="text-right">{item.impressions.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{item.clicks.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={parseFloat(item.ctr) > 5 ? "default" : "secondary"}>
                      {item.ctr}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Content Creation Trends */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Content Creation Trends (Last 30 Days)
          </CardTitle>
          <CardDescription>New content created in the last month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Banners</span>
              <span className="text-2xl font-bold">{analytics.trends.last30Days.banners}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Feeds</span>
              <span className="text-2xl font-bold">{analytics.trends.last30Days.feeds}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Guides</span>
              <span className="text-2xl font-bold">{analytics.trends.last30Days.guides}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Sponsored</span>
              <span className="text-2xl font-bold">{analytics.trends.last30Days.sponsored}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feed Distribution by Tone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Feed Distribution by Tone
          </CardTitle>
          <CardDescription>Active feeds categorized by tone</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {analytics.insights.feedsByTone.map((item) => (
              <div key={item.tone} className="flex flex-col items-center p-4 border rounded-lg">
                <Badge
                  variant={
                    item.tone === "OK"
                      ? "default"
                      : item.tone === "INFO"
                      ? "secondary"
                      : item.tone === "WARN"
                      ? "outline"
                      : "destructive"
                  }
                  className="mb-2"
                >
                  {item.tone}
                </Badge>
                <span className="text-2xl font-bold">{item.count}</span>
                <span className="text-xs text-muted-foreground">feeds</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
