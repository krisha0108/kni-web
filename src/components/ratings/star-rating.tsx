"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: "sm" | "md" | "lg";
  readonly?: boolean;
  showValue?: boolean;
  label?: string;
}

export function StarRating({
  value,
  onChange,
  max = 5,
  size = "md",
  readonly = false,
  showValue = false,
  label,
}: StarRatingProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
          {!readonly && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <div className="flex items-center gap-1">
        {Array.from({ length: max }, (_, i) => i + 1).map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => handleClick(rating)}
            disabled={readonly}
            className={cn(
              "transition-all",
              !readonly && "hover:scale-110 cursor-pointer",
              readonly && "cursor-default"
            )}
            aria-label={`Rate ${rating} out of ${max} stars`}
          >
            <Star
              className={cn(
                sizeClasses[size],
                "transition-colors",
                rating <= value
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-none text-muted-foreground",
                !readonly && rating <= value && "hover:fill-yellow-500 hover:text-yellow-500"
              )}
            />
          </button>
        ))}
        {showValue && (
          <span className="ml-2 text-sm font-medium text-foreground">
            {value > 0 ? `${value.toFixed(1)} / ${max}` : "Not rated"}
          </span>
        )}
      </div>
    </div>
  );
}

interface StarRatingDisplayProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  count?: number;
}

export function StarRatingDisplay({
  value,
  max = 5,
  size = "md",
  showValue = true,
  count,
}: StarRatingDisplayProps) {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const fullStars = Math.floor(value);
  const hasHalfStar = value % 1 >= 0.5;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => {
        const starNumber = i + 1;
        const isFilled = starNumber <= fullStars;
        const isHalf = starNumber === fullStars + 1 && hasHalfStar;

        return (
          <Star
            key={i}
            className={cn(
              sizeClasses[size],
              isFilled
                ? "fill-yellow-400 text-yellow-400"
                : isHalf
                ? "fill-yellow-400/50 text-yellow-400"
                : "fill-none text-muted-foreground"
            )}
          />
        );
      })}
      {showValue && (
        <span className="ml-1 text-sm font-medium text-foreground">
          {value > 0 ? value.toFixed(1) : "0.0"}
          {count !== undefined && (
            <span className="text-muted-foreground ml-1">({count})</span>
          )}
        </span>
      )}
    </div>
  );
}
