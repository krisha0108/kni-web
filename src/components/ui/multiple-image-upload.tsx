"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MultipleImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
  maxImages?: number;
  maxSizeMB?: number;
  disabled?: boolean;
}

export function MultipleImageUpload({
  value = [],
  onChange,
  folder = "general",
  maxImages = 5,
  maxSizeMB = 5,
  disabled = false,
}: MultipleImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Check if adding these files would exceed the max
    const remainingSlots = maxImages - value.length;
    if (files.length > remainingSlots) {
      toast({
        title: "Too many images",
        description: `You can only add ${remainingSlots} more image(s). Maximum ${maxImages} images allowed.`,
        variant: "destructive",
      });
      return;
    }

    // Validate all files
    const invalidFiles = files.filter(file => !file.type.startsWith("image/"));
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid files",
        description: "Please select only image files",
        variant: "destructive",
      });
      return;
    }

    // Validate file sizes
    const oversizedFiles = files.filter(file => file.size > maxSizeMB * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: "Files too large",
        description: `All files must be less than ${maxSizeMB}MB`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(`Uploading 0/${files.length}...`);

    try {
      const uploadedUrls: string[] = [];

      // Upload files one by one
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(`Uploading ${i + 1}/${files.length}...`);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (response.status === 401) {
          toast({
            title: "Authentication Required",
            description: "Please log in to upload images",
            variant: "destructive",
          });
          return;
        }

        const data = await response.json();

        if (data.ok) {
          uploadedUrls.push(data.data.url);
        } else {
          toast({
            title: "Upload Failed",
            description: `Failed to upload ${file.name}: ${data.error}`,
            variant: "destructive",
          });
        }
      }

      if (uploadedUrls.length > 0) {
        // Add new URLs to existing ones
        onChange([...value, ...uploadedUrls]);
        toast({
          title: "Success",
          description: `${uploadedUrls.length} image(s) uploaded successfully`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload images",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress("");
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = (index: number) => {
    const newUrls = value.filter((_, i) => i !== index);
    onChange(newUrls);
  };

  const canAddMore = value.length < maxImages;

  return (
    <div className="space-y-4">
      {/* Display uploaded images */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {value.filter(url => url && url.trim()).map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url}
                alt={`Upload ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border border-border"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-2 py-1 rounded">
                {index + 1}
              </div>
              {!disabled && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemove(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {canAddMore && !disabled && (
        <div
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{uploadProgress}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">
                {value.length === 0 ? "Upload Images" : "Add More Images"}
              </p>
              <p className="text-xs text-muted-foreground">
                {value.length}/{maxImages} images • Click to select multiple files
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG or WebP (max {maxSizeMB}MB each)
              </p>
            </div>
          )}
        </div>
      )}

      {!canAddMore && (
        <p className="text-sm text-center text-muted-foreground">
          Maximum {maxImages} images reached
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        disabled={disabled || isUploading}
        className="hidden"
      />
    </div>
  );
}
