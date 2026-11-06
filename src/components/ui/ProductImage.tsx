"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/cn";

export function ProductImage({
  src,
  name,
  className,
}: {
  src?: string | null;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        onError={() => setFailed(true)}
        className={cn("object-cover", className)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`${name} uchun rasm yo'q`}
      className={cn("flex items-center justify-center bg-surface-muted text-muted", className)}
    >
      <ImageOff className="h-[40%] w-[40%]" strokeWidth={1.5} />
    </div>
  );
}
