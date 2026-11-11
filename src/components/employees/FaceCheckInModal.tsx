"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Loader2, MapPin, MapPinOff, ScanFace, AlertTriangle } from "lucide-react";
import { loadFaceApiModels, detectFaceDescriptor } from "@/lib/faceapi-client";

export function FaceCheckInModal({
  open,
  onClose,
  employeeId,
  employeeName,
  requireLocation,
  requireFace,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  requireLocation: boolean;
  requireFace: boolean;
  onSuccess: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");

  const [modelsReady, setModelsReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const [verifyError, setVerifyError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setGeo(null);
    setGeoError("");
    setModelsReady(false);
    setCameraReady(false);
    setCameraError("");
    setVerifyError("");
    setSubmitting(false);

    setGeoLoading(true);
    if (!navigator.geolocation) {
      setGeoError("Brauzer joylashuvni qo'llab-quvvatlamaydi");
      setGeoLoading(false);
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGeoLoading(false);
        },
        () => {
          setGeoError("Joylashuvga ruxsat berilmadi");
          setGeoLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    if (requireFace) {
      loadFaceApiModels()
        .then(() => setModelsReady(true))
        .catch(() => setCameraError("Yuz tanish modeli yuklanmadi"));

      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "user" } })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
          setCameraReady(true);
        })
        .catch(() => setCameraError("Kameraga ruxsat berilmadi yoki kamera topilmadi"));
    }

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, requireFace]);

  function handleClose() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    onClose();
  }

  async function confirm() {
    setVerifyError("");
    setSubmitting(true);

    let faceDescriptor: number[] | null = null;
    if (requireFace) {
      const video = videoRef.current;
      if (!video) {
        setSubmitting(false);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 320;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      try {
        faceDescriptor = await detectFaceDescriptor(canvas);
      } catch {
        faceDescriptor = null;
      }
      if (!faceDescriptor) {
        setVerifyError("Yuz aniqlanmadi, kameraga to'g'ri qarang va qayta urinib ko'ring");
        setSubmitting(false);
        return;
      }
    }

    const res = await fetch(`/api/employees/${employeeId}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "PRESENT",
        lat: geo?.lat,
        lng: geo?.lng,
        faceDescriptor,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setVerifyError(data.error ?? "Xatolik yuz berdi");
      return;
    }
    onSuccess();
    handleClose();
  }

  const locationBlocking = requireLocation && (geoLoading || !!geoError || !geo);
  const faceBlocking = requireFace && (!modelsReady || !cameraReady || !!cameraError);
  const canConfirm = !locationBlocking && !faceBlocking && !submitting;

  return (
    <Modal open={open} onClose={handleClose} title={`Davomatni belgilash — ${employeeName}`}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs">
          {geoLoading ? (
            <span className="flex items-center gap-1 text-muted">
              <Loader2 size={12} className="animate-spin" /> Joylashuv aniqlanmoqda...
            </span>
          ) : geo ? (
            <span className="flex items-center gap-1 text-accent">
              <MapPin size={12} /> Joylashuv aniqlandi
            </span>
          ) : (
            <span className="flex items-center gap-1 text-danger">
              <MapPinOff size={12} /> {geoError || "Joylashuv aniqlanmadi"}
            </span>
          )}
        </div>

        {requireFace && (
          <div className="flex flex-col items-center gap-2">
            <video
              ref={videoRef}
              muted
              playsInline
              className="h-48 w-64 rounded-lg bg-black object-cover"
            />
            {!cameraReady && !cameraError && (
              <span className="flex items-center gap-1 text-xs text-muted">
                <Loader2 size={12} className="animate-spin" /> Kamera va model yuklanmoqda...
              </span>
            )}
            {cameraError && (
              <span className="flex items-center gap-1 text-xs text-danger">
                <AlertTriangle size={12} /> {cameraError}
              </span>
            )}
            {cameraReady && modelsReady && (
              <span className="flex items-center gap-1 text-xs text-accent">
                <ScanFace size={12} /> Kameraga to'g'ri qarang
              </span>
            )}
          </div>
        )}

        {verifyError && <p className="text-sm text-danger">{verifyError}</p>}

        <div className="flex gap-2">
          <Button onClick={confirm} disabled={!canConfirm} className="flex-1">
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Tasdiqlash
          </Button>
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            Bekor qilish
          </Button>
        </div>
      </div>
    </Modal>
  );
}
