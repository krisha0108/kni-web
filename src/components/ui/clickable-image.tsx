"use client";

interface ClickableImageProps {
  src: string;
  alt: string;
  className?: string;
  openInNewTab?: boolean;
}

export function ClickableImage({ src, alt, className, openInNewTab = true }: ClickableImageProps) {
  const handleClick = () => {
    if (openInNewTab) {
      window.open(src, "_blank");
    }
  };

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onClick={handleClick}
    />
  );
}
