"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Sparkles, Gift } from "lucide-react";
import { useRouter } from "next/navigation";

interface Template {
  id: string;
  name: string;
  description: string;
  data: any;
}

interface Templates {
  offer: Template[];
  feed: Template[];
  guide: Template[];
  sponsored: Template[];
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Templates | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/content/templates");
      const data = await response.json();
      if (data.ok) {
        setTemplates(data.data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch templates",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const useTemplate = async (type: string, template: Template) => {
    try {
      let endpoint = "";
      switch (type) {
        case "offer":
          endpoint = "/api/admin/booking-offers";
          break;
        case "feed":
          endpoint = "/api/admin/feeds";
          break;
        case "guide":
          endpoint = "/api/admin/guides";
          break;
        case "sponsored":
          endpoint = "/api/admin/sponsored-content";
          break;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template.data),
      });

      const data = await response.json();
      if (data.ok) {
        toast({
          title: "Success",
          description: `${template.name} created from template!`,
        });

        // Redirect to the appropriate management page
        switch (type) {
          case "offer":
            router.push("/admin/content/offers");
            break;
          case "feed":
            router.push("/admin/content/feeds");
            break;
          case "guide":
            router.push("/admin/content/guides");
            break;
          case "sponsored":
            router.push("/admin/content/sponsored");
            break;
        }
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create from template",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to use template",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Loading templates...</div>
        </div>
      </div>
    );
  }

  if (!templates) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">No templates available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8" />
          Content Templates
        </h1>
        <p className="text-muted-foreground mt-1">
          Quickly create content from predefined templates
        </p>
      </div>

      <Tabs defaultValue="offer" className="space-y-4">
        <TabsList>
          <TabsTrigger value="offer">Offers ({templates.offer.length})</TabsTrigger>
          <TabsTrigger value="feed">Feeds ({templates.feed.length})</TabsTrigger>
          <TabsTrigger value="guide">Guides ({templates.guide.length})</TabsTrigger>
          <TabsTrigger value="sponsored">Sponsored ({templates.sponsored.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="offer">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.offer.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Gift className="h-5 w-5 text-muted-foreground" />
                    <Badge variant="outline">Offer</Badge>
                  </div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="text-sm">
                      <span className="font-medium">{template.data.discountPercent}% off</span>
                      {template.data.description && (
                        <span className="text-muted-foreground"> — {template.data.description}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary">
                        {template.data.type === "FIRST_BOOKING" ? "First Booking" : "Promotional"}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => useTemplate("offer", template)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="feed">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.feed.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <Badge variant="outline">Feed</Badge>
                  </div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="text-sm">{template.data.text}</div>
                    <div className="flex gap-2">
                      <Badge
                        variant={
                          template.data.tone === "OK"
                            ? "default"
                            : template.data.tone === "INFO"
                            ? "secondary"
                            : template.data.tone === "WARN"
                            ? "outline"
                            : "destructive"
                        }
                      >
                        {template.data.tone}
                      </Badge>
                      {template.data.icon && (
                        <Badge variant="outline">{template.data.icon}</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => useTemplate("feed", template)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="guide">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.guide.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <Badge variant="outline">Guide</Badge>
                  </div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="text-sm font-medium">{template.data.title}</div>
                    {template.data.description && (
                      <div className="text-sm text-muted-foreground">
                        {template.data.description}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Badge variant="secondary">{template.data.minutes} min</Badge>
                      <Badge variant="outline">Order: {template.data.sortOrder}</Badge>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => useTemplate("guide", template)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sponsored">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.sponsored.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <Badge variant="outline">Sponsored</Badge>
                  </div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="text-sm font-medium">{template.data.title}</div>
                    {template.data.description && (
                      <div className="text-sm text-muted-foreground">
                        {template.data.description}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Badge variant="secondary">{template.data.type}</Badge>
                      <Badge variant="outline">{template.data.sponsoredBy}</Badge>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => useTemplate("sponsored", template)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}