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
  telegramBotToken: string | null;
  telegramChatId: string | null;
  customPaymentMethods: string[] | null;
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
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    setDone(false);
    try {
      await patchStore({ name, currency, phone, address });
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
  const [newMethod, setNewMethod] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function persist(next: { enableMixedPayment?: boolean; customPaymentMethods?: string[] }) {
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
    persist({ customPaymentMethods: next });
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold">To&apos;lov usullari</h2>
      <p className="text-xs text-muted">Kassada ko&apos;rinadigan to&apos;lov usullarini sozlang</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone="accent">Naqd</Badge>
        <Badge tone="accent">Karta</Badge>
        <Badge tone="accent">Nasiya</Badge>
        {methods.map((m) => (
          <Badge key={m} tone="neutral" className="gap-1.5">
            {m}
            <button onClick={() => removeMethod(m)} className="text-muted hover:text-danger">
              <Trash2 size={10} />
            </button>
          </Badge>
        ))}
      </div>
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
        Naqd/Karta/Nasiya/Aralash bo&apos;lib qoladi.
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

export function UsdRateCard({ store }: { store: StoreData }) {
  const router = useRouter();
  const [rate, setRate] = useState(store.usdRate != null ? String(store.usdRate) : "");
  const [usdOnly, setUsdOnly] = useState(store.showDebtInUsdOnly);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function save() {
    setSaving(true);
    await patchStore({ usdRate: rate || null, showDebtInUsdOnly: usdOnly }).catch(() => {});
    setSaving(false);
    setDone(true);
    router.refresh();
    setTimeout(() => setDone(false), 1500);
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
      await patchStore({ logoUrl, receiptFooter: footer, telegramUsername, autoPrintReceipt: autoPrint });
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
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo" className="h-14 w-14 rounded-lg border border-border object-contain bg-white" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-surface-muted text-muted">
            <Upload size={18} />
          </div>
        )}
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

  async function save() {
    setSaving(true);
    await patchStore({ telegramBotToken: token, telegramChatId: chatId }).catch(() => {});
    setSaving(false);
    setDone(true);
    router.refresh();
    setTimeout(() => setDone(false), 1500);
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold">Telegram bot</h2>
      <p className="text-xs text-muted">Yangi buyurtmalar haqida xabar olish uchun Telegram botingizni ulang</p>
      <div className="mt-3 flex flex-col gap-3 sm:max-w-sm">
        <Field label="Bot Token">
          <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="@BotFather dan olingan token" />
        </Field>
        <Field label="Chat ID">
          <Input value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="Guruh yoki kanal ID raqami" />
        </Field>
        <SavedTick show={done} />
        <Button onClick={save} disabled={saving} className="self-start">
          {saving && <Loader2 size={16} className="animate-spin" />}
          <Send size={14} /> Telegram sozlamalarini saqlash
        </Button>
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
