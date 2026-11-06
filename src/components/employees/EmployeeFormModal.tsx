"use client";

import { useEffect, useRef, useState } from "react";
import type { Employee } from "@prisma/client";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Loader2, Camera, MapPin, CheckCircle2 } from "lucide-react";

export function EmployeeFormModal({
  open,
  onClose,
  onSaved,
  employee,
  defaultIsCourier = false,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  employee?: Employee | null;
  defaultIsCourier?: boolean;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [isCourier, setIsCourier] = useState(false);
  const [hourlyRate, setHourlyRate] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [locationName, setLocationName] = useState("");
  const [radius, setRadius] = useState("100");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locAccuracy, setLocAccuracy] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(employee?.name ?? "");
      setPhone(employee?.phone ?? "");
      setLogin(employee?.login ?? "");
      setPassword("");
      setIsCourier(employee?.isCourier ?? defaultIsCourier);
      setHourlyRate(employee ? String(employee.hourlyRate) : "");
      setPhotoUrl(employee?.photoUrl ?? "");
      setLocationName(employee?.allowedLocationName ?? "");
      setRadius(employee?.allowedRadius != null ? String(employee.allowedRadius) : "100");
      setLat(employee?.allowedLat ?? null);
      setLng(employee?.allowedLng ?? null);
      setLocAccuracy(null);
      setLocError("");
      setError("");
    }
  }, [open, employee, defaultIsCourier]);

  function detectLocation() {
    if (!navigator.geolocation) {
      setLocError("Brauzer joylashuvni qo'llab-quvvatlamaydi");
      return;
    }
    setLocating(true);
    setLocError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocAccuracy(pos.coords.accuracy);
        setLocating(false);
      },
      () => {
        setLocError("Joylashuvga ruxsat berilmadi");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function save() {
    if (!name) {
      setError("Ismni kiriting");
      return;
    }
    if (!login) {
      setError("Login kiriting");
      return;
    }
    if (!employee && !password) {
      setError("Parol kiriting");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch(employee ? `/api/employees/${employee.id}` : "/api/employees", {
      method: employee ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone,
        login,
        password: password || undefined,
        isCourier,
        hourlyRate,
        photoUrl,
        allowedLocationName: locationName,
        allowedLat: lat,
        allowedLng: lng,
        allowedRadius: radius,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={employee ? "Xodimni tahrirlash" : "Yangi xodim qo'shish"}>
      <div className="flex flex-col gap-3">
        <Field label="Ism *">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Telefon">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" />
        </Field>
        <Field label="Login *">
          <Input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="login" />
        </Field>
        <Field label={employee ? "Parol (o'zgartirish uchun to'ldiring)" : "Parol *"}>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={employee ? "••••••••" : ""}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isCourier}
            onChange={(e) => setIsCourier(e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Kuriyer (yetkazib beruvchi)
        </label>

        <Field label="Soatlik ish haqi (so'm)">
          <Input
            type="number"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            placeholder="Masalan: 15000 so'm/soat"
          />
        </Field>

        <PhotoCaptureField value={photoUrl} onChange={setPhotoUrl} />

        <div className="rounded-lg border border-border p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted">
            <MapPin size={14} /> Ruxsat etilgan joylashuv
          </p>
          <div className="flex flex-col gap-2">
            <Field label="Joylashuv nomi">
              <Input value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="Masalan: Do'kon" />
            </Field>
            <Field label="Ruxsat doirasi (metr)">
              <Input type="number" value={radius} onChange={(e) => setRadius(e.target.value)} placeholder="100" />
            </Field>
            <Button type="button" variant="secondary" size="sm" disabled={locating} onClick={detectLocation}>
              {locating && <Loader2 size={14} className="animate-spin" />}
              Joylashuvni aniqlash
            </Button>
            {lat != null && lng != null && (
              <p className="flex items-center gap-1 text-xs text-accent">
                <CheckCircle2 size={12} /> Aniqlandi
                {locAccuracy != null && <> · aniqligi ~{Math.round(locAccuracy)} metr</>}
              </p>
            )}
            {locError && <p className="text-xs text-danger">{locError}</p>}
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        <Button onClick={save} disabled={saving} className="mt-2">
          {saving && <Loader2 size={16} className="animate-spin" />}
          {employee ? "Saqlash" : "Qo'shish"}
        </Button>
      </div>
    </Modal>
  );
}

function PhotoCaptureField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [error, setError] = useState("");

  async function openCamera() {
    setError("");
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch {
      setError("Kameraga ruxsat berilmadi yoki kamera topilmadi");
    }
  }

  function closeCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 320;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    onChange(canvas.toDataURL("image/jpeg", 0.85));
    closeCamera();
  }

  return (
    <Field label="Yuz rasmi (ixtiyoriy)">
      <div className="flex items-center gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-14 w-14 rounded-lg object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-surface-muted text-muted">
            <Camera size={20} />
          </div>
        )}
        {cameraOpen ? (
          <div className="flex flex-col gap-1.5">
            <video ref={videoRef} muted playsInline className="h-20 w-28 rounded-lg bg-black object-cover" />
            <div className="flex gap-1.5">
              <Button type="button" size="sm" onClick={capture}>
                Suratga olish
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={closeCamera}>
                Bekor qilish
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" size="sm" variant="secondary" onClick={openCamera}>
            <Camera size={14} /> Kamerani ochish
          </Button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </Field>
  );
}
