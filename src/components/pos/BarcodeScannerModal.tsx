"use client";

import { useEffect, useRef, useState } from "react";
import { X, CameraOff, ScanLine } from "lucide-react";

// Minimal typing for the Shape Detection API, which isn't in lib.dom.d.ts yet.
type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
};
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;

export function BarcodeScannerModal({
  open,
  onClose,
  onDetected,
}: {
  open: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!open) return;

    const BarcodeDetectorClass = (
      window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }
    ).BarcodeDetector;

    if (!BarcodeDetectorClass) {
      setSupported(false);
      return;
    }
    setSupported(true);
    setError("");

    let cancelled = false;
    let rafId = 0;
    const detector = new BarcodeDetectorClass({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"],
    });

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

        const scan = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              onDetected(codes[0].rawValue);
              return;
            }
          } catch {
            // transient decode errors are expected between frames
          }
          rafId = requestAnimationFrame(scan);
        };
        rafId = requestAnimationFrame(scan);
      })
      .catch(() => {
        if (!cancelled) setError("Kameraga ruxsat berilmadi yoki kamera topilmadi");
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, onDetected]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-[var(--radius-card)] border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ScanLine size={16} className="text-accent" /> Shtrix kod skaneri
          </h2>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          {!supported ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted">
              <CameraOff size={28} />
              <p>Ushbu brauzer kamera orqali skanerlashni qo&apos;llab-quvvatlamaydi.</p>
              <p className="text-xs">USB/Bluetooth skaner ishlatsangiz, qidiruv maydoniga bevosita skanerlashingiz mumkin.</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-danger">
              <CameraOff size={28} />
              <p>{error}</p>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-xl bg-black">
              <video ref={videoRef} muted playsInline className="aspect-square w-full object-cover" />
              <div className="pointer-events-none absolute inset-6 rounded-lg border-2 border-accent/80" />
            </div>
          )}
          <p className="mt-3 text-center text-xs text-muted">
            Mahsulot shtrix kodini kamera oldiga tuting
          </p>
        </div>
      </div>
    </div>
  );
}
