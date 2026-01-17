"use client";

import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REJECTION_REASON_TEMPLATES, type RejectionReasonTemplateCategory } from "@/lib/validations/rejection";
import { AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface RejectionReasonInputProps {
  value: string;
  onChange: (value: string) => void;
  category?: RejectionReasonTemplateCategory;
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  className?: string;
  showTemplates?: boolean;
}

export function RejectionReasonInput({
  value,
  onChange,
  category,
  label = "Rejection Reason",
  placeholder = "Enter reason for rejection (minimum 10 characters)",
  error,
  required = true,
  minLength = 10,
  maxLength = 500,
  className,
  showTemplates = true,
}: RejectionReasonInputProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  // Get templates for the specified category
  const templates = category ? REJECTION_REASON_TEMPLATES[category] : [];

  const handleTemplateSelect = (template: string) => {
    setSelectedTemplate(template);
    onChange(template);
  };

  const handleClearTemplate = () => {
    setSelectedTemplate("");
  };

  const characterCount = value.length;
  const isUnderMinLength = characterCount > 0 && characterCount < minLength;
  const isOverMaxLength = characterCount > maxLength;

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <Label htmlFor="rejection-reason">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {showTemplates && templates.length > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            Select a template or write your own
          </p>
        )}
      </div>

      {/* Template Selector */}
      {showTemplates && templates.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Select
              value={selectedTemplate}
              onValueChange={handleTemplateSelect}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a template reason (optional)" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template, index) => (
                  <SelectItem key={index} value={template}>
                    {template}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplate && (
              <button
                type="button"
                onClick={handleClearTemplate}
                className="p-2 hover:bg-gray-100 rounded"
                title="Clear template"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Textarea Input */}
      <div className="space-y-2">
        <Textarea
          id="rejection-reason"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "min-h-[100px] resize-none",
            error && "border-red-500 focus-visible:ring-red-500",
            isUnderMinLength && "border-yellow-500",
            isOverMaxLength && "border-red-500"
          )}
          maxLength={maxLength}
          required={required}
        />

        {/* Character Count */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {isUnderMinLength && (
              <span className="text-yellow-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Need {minLength - characterCount} more characters
              </span>
            )}
            {isOverMaxLength && (
              <span className="text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {characterCount - maxLength} characters over limit
              </span>
            )}
          </div>
          <span
            className={cn(
              "text-muted-foreground",
              isUnderMinLength && "text-yellow-600",
              isOverMaxLength && "text-red-600"
            )}
          >
            {characterCount} / {maxLength}
          </span>
        </div>

        {/* Error Message */}
        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Cancellation Reason Input Component
 * Same as rejection reason but with different label
 */
interface CancellationReasonInputProps extends Omit<RejectionReasonInputProps, 'label'> {
  label?: string;
}

export function CancellationReasonInput({
  label = "Cancellation Reason",
  ...props
}: CancellationReasonInputProps) {
  return <RejectionReasonInput label={label} {...props} />;
}
