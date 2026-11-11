"use client";

import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export function ImageLightbox({
  title,
  images,
  index,
  onIndexChange,
  onClose,
}: {
  title: string;
  images: string[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  if (!images.length) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        aria-label="Yopish"
      >
        <X size={20} />
      </button>

      <div
        className="relative flex w-full max-w-2xl items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {images.length > 1 && (
          <button
            type="button"
            onClick={() => onIndexChange((index - 1 + images.length) % images.length)}
            className="absolute left-0 z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Oldingi rasm"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[index]}
          alt={`${title} ${index + 1}/${images.length}`}
          className="max-h-[75vh] max-w-full rounded-lg object-contain"
        />
        {images.length > 1 && (
          <button
            type="button"
            onClick={() => onIndexChange((index + 1) % images.length)}
            className="absolute right-0 z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Keyingi rasm"
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
          {images.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onIndexChange(idx)}
              className={cn("h-1.5 w-1.5 rounded-full bg-white/30", idx === index && "bg-white")}
              aria-label={`${idx + 1}-rasm`}
            />
          ))}
        </div>
      )}

      <span className="text-sm font-medium text-white">
        {title}
        {images.length > 1 && (
          <span className="text-white/60">
            {" "}
            · {index + 1}/{images.length}
          </span>
        )}
      </span>
    </div>
  );
}
