"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CheckCircle2,
  Copy,
  Download,
  Share2,
  Plus,
  Trash2,
  Upload,
  FileSpreadsheet,
  Send,
  MapPin,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";

type StoreData = {
  id: string;
  name: string;
  currency: string;
  phone: string | null;
  address: string | null;
  logoUrl: string | null;
  usdRate: number | null;
  showDebtInUsdOnly: boolean;
  enableMixedPayment: boolean;
  notifyNewOrders: boolean;
  soundAlert: boolean;
  autoPrintReceipt: boolean;
  receiptFooter: string | null;
  telegramUsername: string | null;
  instagramUsername: string | null;
  telegramBotUsername: string | null;
  telegramChannelUsername: string | null;
  telegramBotToken: string | null;
  telegramChatId: string | null;
  customPaymentMethods: string[] | null;
  deferredPaymentMethods: Record<string, boolean> | null;
  fxChannelUsername: string | null;
  fxKeyword: string | null;
  fxNumberIndex: number | null;
  locationLat: number | null;
  locationLng: number | null;
};

async function patchStore(data: Record<string, unknown>) {
  const res = await fetch("/api/store", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Xatolik yuz berdi");
  }
  return res.json();
}

function SavedTick({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p className="flex items-center gap-1.5 text-sm text-accent">
      <CheckCircle2 size={14} /> Saqlandi
    </p>
  );
}

export function StoreInfoForm({ store }: { store: StoreData }) {
  const router = useRouter();
  const [name, setName] = useState(store.name);
  const [currency, setCurrency] = useState(store.currency);
  const [phone, setPhone] = useState(store.phone ?? "");
  const [address, setAddress] = useState(store.address ?? "");
  const [locationLat, setLocationLat] = useState(store.locationLat);
  const [locationLng, setLocationLng] = useState(store.locationLng);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function detectLocation() {
    if (!navigator.geolocation) {
      setLocationError("Qurilma joylashuvni aniqlay olmaydi");
      return;
    }
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationLat(pos.coords.latitude);
        setLocationLng(pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setLocationError("Joylashuvga ruxsat berilmadi yoki aniqlab bo'lmadi");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function save() {
    setSaving(true);
    setError("");
    setDone(false);
    try {
      await patchStore({ name, currency, phone, address, locationLat, locationLng });
      setDone(true);
      router.refresh();
      setTimeout(() => setDone(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold">Do&apos;kon ma&apos;lumotlari</h2>
      <p className="text-xs text-muted">Do&apos;kon haqida asosiy ma&apos;lumotlar</p>
      <div className="mt-4 flex flex-col gap-3 sm:max-w-sm">
        <Field label="Do'kon nomi">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Telefon raqam">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" />
        </Field>
        <Field label="Manzil">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <div>
          <p className="text-xs font-medium text-muted">Do&apos;kon joylashuvi (xaritada)</p>
          <p className="mt-0.5 text-xs text-muted">
            Bot &quot;📍 Manzilimiz&quot; tugmasi bosilganda mijozga shu joylashuv yuboriladi.
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={detectLocation}
              disabled={locating}
              className="flex items-center gap-1.5 text-xs font-medium text-accent disabled:opacity-60"
            >
              {locating ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} />}
              {locating ? "Aniqlanmoqda..." : "Joriy joylashuvni olish"}
            </button>
            {locationLat != null && locationLng != null && (
              <button
                type="button"
                onClick={() => {
                  setLocationLat(null);
                  setLocationLng(null);
                }}
                className="text-xs font-medium text-danger"
              >
                O&apos;chirish
              </button>
            )}
          </div>
          {locationError && <p className="mt-1 text-xs text-danger">{locationError}</p>}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Input
              type="number"
              value={locationLat ?? ""}
              onChange={(e) => setLocationLat(e.target.value === "" ? null : Number(e.target.value))}
              placeholder="Kenglik (lat)"
            />
            <Input
              type="number"
              value={locationLng ?? ""}
              onChange={(e) => setLocationLng(e.target.value === "" ? null : Number(e.target.value))}
              placeholder="Uzunlik (lng)"
            />
          </div>
          {locationLat != null && locationLng != null && (
            <div className="mt-2 overflow-hidden rounded-lg border border-border">
              <iframe
                key={`${locationLat},${locationLng}`}
                title="Do'kon joylashuvi"
                className="h-40 w-full"
                loading="lazy"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${locationLng - 0.01}%2C${locationLat - 0.01}%2C${locationLng + 0.01}%2C${locationLat + 0.01}&layer=mapnik&marker=${locationLat}%2C${locationLng}`}
              />
            </div>
          )}
        </div>
        <Field label="Valyuta belgisi">
          <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <SavedTick show={done} />
        <Button onClick={save} disabled={saving} className="mt-1 self-start">
          {saving && <Loader2 size={16} className="animate-spin" />}
          Saqlash
        </Button>
      </div>
    </Card>
  );
}

export function StorefrontLinkCard({ slug }: { slug: string }) {
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setLink(`${window.location.origin}/do-kon`);
  }, []);

  useEffect(() => {
    if (!link) return;
    let cancelled = false;
    import("qrcode").then((QRCode) => {
      if (cancelled) return;
      QRCode.toDataURL(link, { width: 220, margin: 1 }).then((url) => {
        if (!cancelled) setQrUrl(url);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [link]);

  function copy() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function download() {
    if (!qrUrl) return;
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `${slug}-qr.png`;
    a.click();
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Do'kon", url: link });
      } catch {
        // user canceled the share sheet
      }
    } else {
      copy();
    }
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold">Do&apos;kon linki</h2>
      <p className="text-xs text-muted">Bu linkni mijozlaringizga ulashing</p>
      <div className="mt-3 flex items-center gap-2">
        <input
          readOnly
          value={link}
          className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-muted outline-none"
        />
        <Button size="sm" variant="secondary" onClick={copy}>
          {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
        </Button>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold">Do&apos;kon QR kodi</h3>
        <p className="text-xs text-muted">QR kodni mijozlarga ulashing yoki chop eting</p>
        <div className="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          {qrUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrUrl} alt="QR kod" className="h-40 w-40 rounded-lg border border-border bg-white p-2" />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center rounded-lg border border-border bg-surface-muted">
              <Loader2 className="animate-spin text-muted" size={20} />
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={download} disabled={!qrUrl}>
              <Download size={14} /> Yuklab olish
            </Button>
            <Button size="sm" variant="secondary" onClick={share}>
              <Share2 size={14} /> Ulashish
            </Button>
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </Card>
  );
}

export function PaymentSettingsCard({ store }: { store: StoreData }) {
  const router = useRouter();
  const [enableMixedPayment, setEnableMixedPayment] = useState(store.enableMixedPayment);
  const [methods, setMethods] = useState<string[]>(store.customPaymentMethods ?? []);
  const [deferred, setDeferred] = useState<Record<string, boolean>>(store.deferredPaymentMethods ?? {});
  const [newMethod, setNewMethod] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function persist(next: {
    enableMixedPayment?: boolean;
    customPaymentMethods?: string[];
    deferredPaymentMethods?: Record<string, boolean>;
  }) {
    setSaving(true);
    await patchStore(next).catch(() => {});
    setSaving(false);
    setDone(true);
    router.refresh();
    setTimeout(() => setDone(false), 1500);
  }

  function addMethod() {
    const name = newMethod.trim();
    if (!name || methods.includes(name)) return;
    const next = [...methods, name];
    setMethods(next);
    setNewMethod("");
    persist({ customPaymentMethods: next });
  }

  function removeMethod(name: string) {
    const next = methods.filter((m) => m !== name);
    setMethods(next);
    if (name in deferred) {
      const nextDeferred = { ...deferred };
      delete nextDeferred[name];
      setDeferred(nextDeferred);
      persist({ customPaymentMethods: next, deferredPaymentMethods: nextDeferred });
    } else {
      persist({ customPaymentMethods: next });
    }
  }

  function toggleDeferred(name: string, on: boolean) {
    const next = { ...deferred };
    if (on) next[name] = true;
    else delete next[name];
    setDeferred(next);
    persist({ deferredPaymentMethods: next });
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold">To&apos;lov usullari</h2>
      <p className="text-xs text-muted">Kassada ko&apos;rinadigan to&apos;lov usullarini sozlang</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone="accent">Naqd</Badge>
        <Badge tone="accent">Karta</Badge>
        <Badge tone="accent">Nasiya</Badge>
      </div>

      {methods.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {methods.map((m) => (
            <div
              key={m}
              className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-border px-3 py-2"
            >
              <span className="text-sm font-medium">{m}</span>
              <button onClick={() => removeMethod(m)} className="text-muted hover:text-danger" title="O'chirish">
                <Trash2 size={12} />
              </button>
              <label className="ml-auto flex items-center gap-1.5 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={m in deferred}
                  onChange={(e) => toggleDeferred(m, e.target.checked)}
                />
                Kechiktirilgan (uchinchi tomon)
              </label>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex max-w-xs gap-2">
        <Input
          value={newMethod}
          onChange={(e) => setNewMethod(e.target.value)}
          placeholder="Masalan: Click, Payme"
        />
        <Button size="sm" variant="secondary" onClick={addMethod}>
          <Plus size={14} />
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted">
        Qo&apos;shimcha usullar hisobga olish uchun ro&apos;yxatda saqlanadi; kassadagi to&apos;lov tugmalari
        Naqd/Karta/Nasiya/Aralash bo&apos;lib qoladi. &quot;Kechiktirilgan&quot; belgilangan usul — mahsulot
        uchinchi tomon kompaniyasi orqali sotilgan va pul do&apos;konga darhol tushmaydi; kassada shu usul
        tanlanganda pul kelish sanasi va izoh kiritiladi (Moliya → Ishonch/Yuksalish
        bo&apos;limida kuzatiladi).
      </p>

      <div className="mt-4 border-t border-dashed border-border pt-4">
        <Switch
          checked={enableMixedPayment}
          onChange={(v) => {
            setEnableMixedPayment(v);
            persist({ enableMixedPayment: v });
          }}
          label="Aralash to'lov (Naqd + Karta + Nasiya)"
          description="Yoqilganda kassa savatchasida &quot;Aralash to'lov&quot; tugmasi ko'rinadi: bir savdoni bir nechta to'lov turiga bo'lib to'lash mumkin."
        />
      </div>
      {(saving || done) && (
        <p className="mt-2 text-xs text-muted">{saving ? "Saqlanmoqda..." : "Saqlandi"}</p>
      )}
    </Card>
  );
}

// The keyword to search for in the channel's latest post, and which
// numbered "real" number (4+ digits, ignoring small +N/-N change markers)
// after it is the rate. For @namangankurs's format this lands on the sell
// figure (the 2nd big number after the USD heading), not the "100$ = ..."
// summary line further down, which is the cost of 100 dollars, not one.
const DEFAULT_FX_KEYWORD = "АҚШ Доллари";
const DEFAULT_FX_NUMBER_INDEX = 2;

export function UsdRateCard({ store }: { store: StoreData }) {
  const router = useRouter();
  const [rate, setRate] = useState(store.usdRate != null ? String(store.usdRate) : "");
  const [usdOnly, setUsdOnly] = useState(store.showDebtInUsdOnly);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const [fxChannelUsername, setFxChannelUsername] = useState(store.fxChannelUsername ?? "");
  const [fxKeyword, setFxKeyword] = useState(store.fxKeyword ?? DEFAULT_FX_KEYWORD);
  const [fxNumberIndex, setFxNumberIndex] = useState(
    store.fxNumberIndex != null ? String(store.fxNumberIndex) : String(DEFAULT_FX_NUMBER_INDEX)
  );
  const [channelSaving, setChannelSaving] = useState(false);
  const [channelResult, setChannelResult] = useState("");
  const [channelError, setChannelError] = useState("");

  async function save() {
    setSaving(true);
    await patchStore({ usdRate: rate || null, showDebtInUsdOnly: usdOnly }).catch(() => {});
    setSaving(false);
    setDone(true);
    router.refresh();
    setTimeout(() => setDone(false), 1500);
  }

  async function saveChannel() {
    setChannelSaving(true);
    setChannelError("");
    setChannelResult("");
    const username = fxChannelUsername.trim().replace(/^@/, "");
    const keyword = fxKeyword.trim();
    const index = Number(fxNumberIndex) || DEFAULT_FX_NUMBER_INDEX;
    await patchStore({
      fxChannelUsername: username || null,
      fxKeyword: username ? keyword || DEFAULT_FX_KEYWORD : null,
      fxNumberIndex: username ? index : null,
    }).catch(() => {});
    setFxChannelUsername(username);
    router.refresh();

    if (!username) {
      setChannelSaving(false);
      setChannelResult("Kanal o'chirildi — endi CBU kursi ishlatiladi.");
      return;
    }
    const res = await fetch("/api/usd-rate");
    const data = await res.json().catch(() => ({}));
    setChannelSaving(false);
    if (data?.rate?.source === "telegram") {
      setChannelResult(`✓ Kanaldan olindi: 1$ = ${Number(data.rate.rate).toLocaleString("en-US")} so'm`);
    } else {
      setChannelError(
        "Kanaldan kurs topilmadi — hozircha CBU kursiga qaytildi. Username va qidiruv so'zini tekshiring."
      );
    }
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold">Dollar kursi</h2>
      <p className="text-xs text-muted">Tovar beruvchidan dollar bilan olinganda ishlatiladigan standart kurs</p>
      <div className="mt-3 flex items-end gap-2 sm:max-w-xs">
        <Field label="1 dollar = ? so'm">
          <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="12500" />
        </Field>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving && <Loader2 size={14} className="animate-spin" />}
          Saqlash
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted">Misol: $100 tovar = {rate ? (Number(rate) * 100).toLocaleString("en-US") : "?"} so&apos;m</p>

      <div className="mt-4 border-t border-dashed border-border pt-4">
        <Switch
          checked={usdOnly}
          onChange={(v) => {
            setUsdOnly(v);
            patchStore({ showDebtInUsdOnly: v }).then(() => router.refresh());
          }}
          label="Qarzlarni faqat dollarda ko'rsatish"
          description="Yoqilganda Moliya → Tovar beruvchi sahifasida qarz so'mlarda emas, faqat dollarda ($) ko'rinadi."
        />
      </div>

      <div className="mt-4 border-t border-dashed border-border pt-4">
        <h3 className="text-sm font-semibold">Valyuta kursi manbai (bozor kursi)</h3>
        <p className="mt-1 text-xs text-muted">
          Belgilansa, kurs CBU o&apos;rniga shu Telegram kanalining so&apos;nggi postidan olinadi. Kanal
          bo&apos;sh bo&apos;lsa yoki post mos kelmasa, CBU kursiga qaytiladi.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:max-w-md">
          <Field label="Telegram kanal username">
            <Input
              value={fxChannelUsername}
              onChange={(e) => setFxChannelUsername(e.target.value)}
              placeholder="masalan: namangankurs"
            />
          </Field>
          <Field label="Qidiruv so'zi (postda qaysi qator)">
            <Input
              value={fxKeyword}
              onChange={(e) => setFxKeyword(e.target.value)}
              placeholder={DEFAULT_FX_KEYWORD}
            />
          </Field>
          <Field label="Nechanchi raqam (shu so'zdan keyin)">
            <Input
              type="number"
              min={1}
              value={fxNumberIndex}
              onChange={(e) => setFxNumberIndex(e.target.value)}
              placeholder={String(DEFAULT_FX_NUMBER_INDEX)}
              className="sm:max-w-[140px]"
            />
          </Field>
          <p className="text-xs text-muted">
            Masalan: postda &quot;АҚШ Доллари ... 11&apos;970 ... 12&apos;010&quot; bo&apos;lsa, 2-raqam —
            12&apos;010 (sotish kursi). Kichik &quot;+10&quot;/&quot;-5&quot; kabi o&apos;zgarish
            ko&apos;rsatkichlari hisobga olinmaydi.
          </p>
          <Button size="sm" variant="secondary" onClick={saveChannel} disabled={channelSaving} className="self-start">
            {channelSaving && <Loader2 size={14} className="animate-spin" />}
            Saqlash va tekshirish
          </Button>
          {channelResult && <p className="text-xs text-accent">{channelResult}</p>}
          {channelError && <p className="text-xs text-danger">{channelError}</p>}
        </div>
      </div>
      {done && <SavedTick show={done} />}
    </Card>
  );
}

export function NotificationsCard({ store }: { store: StoreData }) {
  const router = useRouter();
  const [notify, setNotify] = useState(store.notifyNewOrders);
  const [sound, setSound] = useState(store.soundAlert);

  async function update(next: { notifyNewOrders?: boolean; soundAlert?: boolean }) {
    await patchStore(next).catch(() => {});
    router.refresh();
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold">Bildirishnomalar</h2>
      <p className="text-xs text-muted">Bildirishnomalar sozlamalari</p>
      <div className="mt-3 divide-y divide-border/60">
        <Switch
          checked={notify}
          onChange={(v) => {
            setNotify(v);
            update({ notifyNewOrders: v });
          }}
          label="Yangi buyurtmalar haqida xabar olish"
          description="Kassa sahifasida yangi onlayn buyurtmalar bo'limi ko'rinadi."
        />
        <Switch
          checked={sound}
          onChange={(v) => {
            setSound(v);
            update({ soundAlert: v });
          }}
          label="Ovozli signal"
          description="Yangi sotuv/buyurtma uchun ovozli signal"
        />
      </div>
    </Card>
  );
}

export function ReceiptSettingsCard({ store }: { store: StoreData }) {
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState(store.logoUrl ?? "");
  const [footer, setFooter] = useState(store.receiptFooter ?? "");
  const [telegramUsername, setTelegramUsername] = useState(store.telegramUsername ?? "");
  const [instagramUsername, setInstagramUsername] = useState(store.instagramUsername ?? "");
  const [telegramBotUsername, setTelegramBotUsername] = useState(store.telegramBotUsername ?? "");
  const [telegramChannelUsername, setTelegramChannelUsername] = useState(store.telegramChannelUsername ?? "");
  const [autoPrint, setAutoPrint] = useState(store.autoPrintReceipt);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function pickLogo(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setError("Fayl hajmi 5MB dan oshmasligi kerak");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      await patchStore({
        logoUrl,
        receiptFooter: footer,
        telegramUsername,
        instagramUsername,
        telegramBotUsername,
        telegramChannelUsername,
        autoPrintReceipt: autoPrint,
      });
      setDone(true);
      router.refresh();
      setTimeout(() => setDone(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold">Printer va chek sozlamalari</h2>
      <p className="text-xs text-muted">Chek chiqarish va unda ko&apos;rinadigan ma&apos;lumotlar</p>

      <div className="mt-3">
        <Switch
          checked={autoPrint}
          onChange={setAutoPrint}
          label="Avtomatik chop etish"
          description="&quot;Sotildi&quot; tugmasi bosilganda chek avtomatik chiqadi — qo'shimcha tugma bosish kerak emas. Brauzerda pop-up oynalarga ruxsat berilgan bo'lishi shart."
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl || "/logo.png"} alt="Logo" className="h-14 w-auto max-w-[140px] rounded-lg border border-border object-contain bg-white" />
        <div>
          <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={14} /> Logo yuklash
          </Button>
          <p className="mt-1 text-xs text-muted">PNG yoki JPEG, 5MB gacha</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && pickLogo(e.target.files[0])}
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:max-w-sm">
        <Field label="Telegram username (chekda)">
          <Input value={telegramUsername} onChange={(e) => setTelegramUsername(e.target.value)} placeholder="@dokonim" />
        </Field>
        <Field label="Instagram username (chekda)">
          <Input value={instagramUsername} onChange={(e) => setInstagramUsername(e.target.value)} placeholder="@dokonim" />
        </Field>
        <Field label="Telegram bot username (chekda)">
          <Input value={telegramBotUsername} onChange={(e) => setTelegramBotUsername(e.target.value)} placeholder="@dokonim_bot" />
        </Field>
        <Field label="Telegram kanal username (chekda)">
          <Input value={telegramChannelUsername} onChange={(e) => setTelegramChannelUsername(e.target.value)} placeholder="@dokonim" />
        </Field>
        <Field label="Chek pastki yozuvi">
          <Input value={footer} onChange={(e) => setFooter(e.target.value)} placeholder="Xaridingiz uchun rahmat!" />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <SavedTick show={done} />
        <Button onClick={save} disabled={saving} className="self-start">
          {saving && <Loader2 size={16} className="animate-spin" />}
          Saqlash
        </Button>
      </div>
    </Card>
  );
}

export function TelegramBotCard({ store }: { store: StoreData }) {
  const router = useRouter();
  const [token, setToken] = useState(store.telegramBotToken ?? "");
  const [chatId, setChatId] = useState(store.telegramChatId ?? "");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerMsg, setRegisterMsg] = useState("");
  const [registerError, setRegisterError] = useState("");

  async function save() {
    setSaving(true);
    await patchStore({ telegramBotToken: token, telegramChatId: chatId }).catch(() => {});
    setSaving(false);
    setDone(true);
    router.refresh();
    setTimeout(() => setDone(false), 1500);
  }

  async function registerWebhook() {
    setRegistering(true);
    setRegisterError("");
    setRegisterMsg("");
    const res = await fetch("/api/telegram/webhook/register", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setRegistering(false);
    if (!res.ok) {
      setRegisterError(data.error ?? "Xatolik yuz berdi");
      return;
    }
    setRegisterMsg(`Ulandi: ${data.webhookUrl}`);
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold">Telegram bot</h2>
      <p className="text-xs text-muted">
        Yangi buyurtmalar haqida xabar olish va mijozlar botdan xarid qilishi uchun Telegram botingizni ulang
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:max-w-sm">
        <Field label="Bot Token">
          <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="@BotFather dan olingan token" />
        </Field>
        <Field label="Chat ID (buyurtma xabarlari uchun, ixtiyoriy)">
          <Input value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="Guruh yoki kanal ID raqami" />
        </Field>
        <SavedTick show={done} />
        <Button onClick={save} disabled={saving} className="self-start">
          {saving && <Loader2 size={16} className="animate-spin" />}
          <Send size={14} /> Telegram sozlamalarini saqlash
        </Button>
      </div>

      <div className="mt-4 border-t border-dashed border-border pt-4">
        <p className="text-xs text-muted">
          Mijozlar botga <code>/start</code> yuborib katalogni ko&apos;rish, savatchaga qo&apos;shish va
          buyurtma berishi uchun botni serverga ulang (token saqlangandan keyin bir marta bosing).
        </p>
        <Button
          size="sm"
          variant="secondary"
          onClick={registerWebhook}
          disabled={registering || !store.telegramBotToken}
          className="mt-2"
        >
          {registering && <Loader2 size={14} className="animate-spin" />}
          Bot do&apos;konini ulash
        </Button>
        {registerMsg && <p className="mt-2 break-all text-xs text-accent">{registerMsg}</p>}
        {registerError && <p className="mt-2 text-xs text-danger">{registerError}</p>}
      </div>
    </Card>
  );
}

export function DataExportCard() {
  const [exporting, setExporting] = useState(false);

  async function exportData() {
    setExporting(true);
    try {
      const [products, customers, sales] = await Promise.all([
        fetch("/api/products?take=10000").then((r) => r.json()),
        fetch("/api/customers").then((r) => r.json()).catch(() => ({ customers: [] })),
        fetch("/api/sales/summary?period=all").then((r) => r.json()).catch(() => null),
      ]);
      const XLSX = await import("xlsx");
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        book,
        XLSX.utils.json_to_sheet(
          (products.products ?? []).map((p: { name: string; sku: string; price: number; costPrice: number; stock: number }) => ({
            Nomi: p.name,
            SKU: p.sku,
            Narx: p.price,
            Tannarx: p.costPrice,
            Qoldiq: p.stock,
          }))
        ),
        "Mahsulotlar"
      );
      XLSX.utils.book_append_sheet(
        book,
        XLSX.utils.json_to_sheet(
          (customers.customers ?? []).map((c: { name: string; phone: string | null }) => ({
            Ism: c.name,
            Telefon: c.phone ?? "",
          }))
        ),
        "Mijozlar"
      );
      const date = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(book, `savdo-export-${date}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold">Ma&apos;lumotlar</h2>
      <p className="text-xs text-muted">Ma&apos;lumotlarni boshqarish</p>
      <Button size="sm" variant="secondary" className="mt-3" onClick={exportData} disabled={exporting}>
        {exporting ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
        Ma&apos;lumotlarni eksport qilish
      </Button>
    </Card>
  );
}

export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    setDone(false);
    const res = await fetch("/api/auth/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold">Xavfsizlik</h2>
      <p className="text-xs text-muted">Parolni o&apos;zgartirish</p>
      <div className="mt-4 flex flex-col gap-3 sm:max-w-sm">
        <Field label="Joriy parol">
          <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </Field>
        <Field label="Yangi parol">
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        {done && (
          <p className="flex items-center gap-1.5 text-sm text-accent">
            <CheckCircle2 size={14} /> Parol yangilandi
          </p>
        )}
        <Button onClick={save} disabled={saving} className="mt-1 self-start">
          {saving && <Loader2 size={16} className="animate-spin" />}
          Yangilash
        </Button>
      </div>
    </Card>
  );
}
