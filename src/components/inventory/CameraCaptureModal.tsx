"use client";

import { useEffect, useRef, useState } from "react";
import { X, CameraOff, Camera } from "lucide-react";
import { Button } from "@/components/ui/Button";

const MAX_SIDE = 1280;

const hasCamera = () => typeof navigator.mediaDevices?.getUserMedia === "function";

// Live camera preview; "Suratga olish" captures the current frame as a
// downscaled JPEG data URL.
export function CameraCaptureModal({
  open,
  onClose,
  onCapture,
}: {
  open: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}) {
  // Mounted only while open so every opening starts with fresh state.
  if (!open) return null;
  return <CameraPanel onClose={onClose} onCapture={onCapture} />;
}

function CameraPanel({
  onClose,
  onCapture,
}: {
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(() =>
    hasCamera() ? "" : "Ushbu brauzer kamerani qo'llab-quvvatlamaydi"
  );

  useEffect(() => {
    if (!hasCamera()) return;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setError("Kameraga ruxsat berilmadi yoki kamera topilmadi");
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    onCapture(canvas.toDataURL("image/jpeg", 0.85));
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-[var(--radius-card)] border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Camera size={16} className="text-accent" /> Rasmga olish
          </h2>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-col gap-3 p-5">
          {error ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-danger">
              <CameraOff size={28} />
              <p>{error}</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl bg-black">
              <video ref={videoRef} muted playsInline className="aspect-[4/3] w-full object-cover" />
            </div>
          )}
          <Button type="button" onClick={capture} disabled={!ready || !!error}>
            <Camera size={16} /> Suratga olish
          </Button>
        </div>
      </div>
    </div>
  );
}
