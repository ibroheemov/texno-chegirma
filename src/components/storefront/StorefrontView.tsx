"use client";

import { useEffect, useMemo, useState } from "react";
import type { Category, Product } from "@prisma/client";
import { ShoppingCart, Plus, Minus, Trash2, Loader2, CheckCircle2, Search, MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { formatSom } from "@/lib/format";
import { cn } from "@/lib/cn";

type ProductWithCategory = Product & { category: Category | null };
type CartLine = { product: ProductWithCategory; qty: number };

export function StorefrontView({
  products,
  categories,
  initialOnSaleOnly = false,
}: {
  products: ProductWithCategory[];
  categories: Category[];
  initialOnSaleOnly?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [onSaleOnly, setOnSaleOnly] = useState(initialOnSaleOnly);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (onSaleOnly && !p.onSale) return false;
      if (categoryId && p.categoryId !== categoryId) return false;
      if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [products, categoryId, query, onSaleOnly]);

  function addToCart(product: ProductWithCategory) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map((l) => (l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, { product, qty: 1 }];
    });
    setCartOpen(true);
  }

  const totalQty = cart.reduce((s, l) => s + l.qty, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Mahsulot qidirish..."
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>
        <button
          onClick={() => setCartOpen(true)}
          className="relative flex h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground"
        >
          <ShoppingCart size={16} />
          Savatcha
          {totalQty > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
              {totalQty}
            </span>
          )}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryId(undefined)}
          className={cn(
            "rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted",
            !categoryId && "border-accent bg-accent-soft text-accent"
          )}
        >
          Barchasi
        </button>
        <button
          onClick={() => setOnSaleOnly((v) => !v)}
          className={cn(
            "rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted",
            onSaleOnly && "border-accent bg-accent-soft text-accent"
          )}
        >
          🏷 Aksiyadagi tovarlar
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoryId(c.id)}
            className={cn(
              "rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted",
              categoryId === c.id && "border-accent bg-accent-soft text-accent"
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((p) => (
          <Card key={p.id} className="flex flex-col gap-2 p-3">
            <div className="flex aspect-square items-center justify-center rounded-lg bg-surface-muted text-muted">
              <ShoppingCart size={28} />
            </div>
            <p className="line-clamp-2 text-sm font-semibold leading-snug">{p.name}</p>
            <Badge tone="accent" className="w-fit">
              {p.stock} dona
            </Badge>
            <div className="mt-auto flex items-center justify-between">
              <span className="text-sm font-bold">{formatSom(p.price)}</span>
              <button
                onClick={() => addToCart(p)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent"
              >
                <Plus size={16} />
              </button>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-16 text-center text-sm text-muted">Hech narsa topilmadi</p>
        )}
      </div>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        setCart={setCart}
      />
    </div>
  );
}

function CartDrawer({
  open,
  onClose,
  cart,
  setCart,
}: {
  open: boolean;
  onClose: () => void;
  cart: CartLine[];
  setCart: React.Dispatch<React.SetStateAction<CartLine[]>>;
}) {
  const [name, setName] = useState(() => {
    if (typeof window === "undefined") return "";
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    return user ? [user.first_name, user.last_name].filter(Boolean).join(" ") : "";
  });

  // In a private chat with the bot, Telegram's chat id equals the user's own
  // id — the same id the bot stores as Customer.telegramChatId when the user
  // registers. Prefer the full name they gave the bot over their raw Telegram
  // profile name, once it loads.
  useEffect(() => {
    const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    if (!userId) return;
    fetch(`/api/public/telegram-customer?chatId=${userId}`)
      .then((res) => res.json())
      .then((data: { name: string | null }) => {
        if (data.name) setName(data.name);
      })
      .catch(() => {});
  }, []);

  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "INSTALLMENT">("CASH");
  const [installmentMonths, setInstallmentMonths] = useState<3 | 6 | 12>(3);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const total = cart.reduce((s, l) => s + l.product.price * l.qty, 0);

  function changeQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.product.id === productId
            ? { ...l, qty: Math.min(l.product.stock, Math.max(0, l.qty + delta)) }
            : l
        )
        .filter((l) => l.qty > 0)
    );
  }

  function detectLocation() {
    if (!navigator.geolocation) {
      setLocationError("Qurilmangiz joylashuvni aniqlay olmaydi");
      return;
    }
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setMapCoords({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=uz`
          );
          const data = await res.json();
          if (data?.display_name) setAddress(data.display_name);
        } catch {
          // Reverse geocoding failed — the map pin is still shown, customer can type the address manually.
        }
        setLocating(false);
      },
      () => {
        setLocationError("Joylashuvga ruxsat berilmadi yoki aniqlab bo'lmadi");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function submit() {
    setError("");
    if (!name || !phone) {
      setError("Ism va telefon raqamingizni kiriting");
      return;
    }
    if (!cart.length) {
      setError("Savatcha bo'sh");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/public/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: name,
        customerPhone: phone,
        customerAddress: address,
        paymentMethod: paymentMethod === "INSTALLMENT" ? "CUSTOM" : paymentMethod,
        installmentMonths: paymentMethod === "INSTALLMENT" ? installmentMonths : undefined,
        items: cart.map((l) => ({ productId: l.product.id, name: l.product.name, qty: l.qty, price: l.product.price })),
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }
    setCart([]);
    setName("");
    setPhone("");
    setAddress("");
    setMapCoords(null);
    setLocationError("");
    setPaymentMethod("CASH");
    setInstallmentMonths(3);
    setSuccess(true);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-sm flex-col bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 pb-4">
          <h2 className="text-sm font-semibold">Savatcha</h2>
          <button onClick={onClose} className="text-muted">
            ✕
          </button>
        </div>

        {success ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-5 text-center">
            <CheckCircle2 size={40} className="text-accent" />
            <p className="text-sm font-semibold">Buyurtma qabul qilindi!</p>
            <p className="text-xs text-muted">Tez orada siz bilan bog&apos;lanamiz</p>
            <Button size="sm" onClick={onClose}>
              Yopish
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5">
              {cart.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted">Savatcha bo&apos;sh</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {cart.map((l) => (
                    <div key={l.product.id} className="flex items-center gap-2 rounded-lg bg-surface-muted p-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{l.product.name}</p>
                        <p className="text-xs text-muted">{formatSom(l.product.price)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => changeQty(l.product.id, -1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-surface"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-5 text-center text-sm font-semibold">{l.qty}</span>
                        <button
                          onClick={() => changeQty(l.product.id, 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-surface"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <button
                        onClick={() => setCart((p) => p.filter((x) => x.product.id !== l.product.id))}
                        className="text-muted hover:text-danger"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-dashed border-border pt-3 text-base">
                <span className="font-semibold">JAMI</span>
                <span className="font-bold text-accent">{formatSom(total)}</span>
              </div>

              <div className="mt-4 flex flex-col gap-3 pb-5">
                <Field label="Ismingiz">
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="Telefon raqamingiz">
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" />
                </Field>
                <Field label="Yetkazib berish manzili (ixtiyoriy)">
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Mahalla, ko'cha, uy..." />
                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={locating}
                    className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-accent disabled:opacity-60"
                  >
                    {locating ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} />}
                    {locating ? "Joylashuv aniqlanmoqda..." : "Joylashuvimni xaritadan aniqlash"}
                  </button>
                  {locationError && <p className="mt-1 text-xs text-danger">{locationError}</p>}
                  {mapCoords && (
                    <div className="mt-2 overflow-hidden rounded-lg border border-border">
                      <iframe
                        key={`${mapCoords.lat},${mapCoords.lng}`}
                        title="Joylashuv xaritasi"
                        className="h-40 w-full"
                        loading="lazy"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapCoords.lng - 0.01}%2C${mapCoords.lat - 0.01}%2C${mapCoords.lng + 0.01}%2C${mapCoords.lat + 0.01}&layer=mapnik&marker=${mapCoords.lat}%2C${mapCoords.lng}`}
                      />
                    </div>
                  )}
                </Field>
                <Field label="To'lov usuli">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("CASH")}
                      className={cn(
                        "rounded-lg border border-border py-2 text-sm font-medium text-muted",
                        paymentMethod === "CASH" && "border-accent bg-accent-soft text-accent"
                      )}
                    >
                      Naqd
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("CARD")}
                      className={cn(
                        "rounded-lg border border-border py-2 text-sm font-medium text-muted",
                        paymentMethod === "CARD" && "border-accent bg-accent-soft text-accent"
                      )}
                    >
                      Karta
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("INSTALLMENT")}
                      className={cn(
                        "rounded-lg border border-border py-2 text-xs font-medium text-muted",
                        paymentMethod === "INSTALLMENT" && "border-accent bg-accent-soft text-accent"
                      )}
                    >
                      Muddatli to&apos;lov
                    </button>
                  </div>
                </Field>

                {paymentMethod === "INSTALLMENT" && (
                  <div className="rounded-lg bg-surface-muted p-3">
                    <p className="text-xs font-medium text-muted">Necha oyga bo&apos;lib to&apos;lamoqchisiz?</p>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {([3, 6, 12] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setInstallmentMonths(m)}
                          className={cn(
                            "rounded-lg border border-border py-2 text-sm font-medium text-muted",
                            installmentMonths === m && "border-accent bg-accent-soft text-accent"
                          )}
                        >
                          {m} oy
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-sm">
                      Oyiga to&apos;lov:{" "}
                      <span className="font-bold text-accent">
                        {formatSom(Math.ceil(total / installmentMonths))}
                      </span>
                    </p>
                  </div>
                )}
                {error && <p className="text-sm text-danger">{error}</p>}
              </div>
            </div>
            <div className="shrink-0 border-t border-border p-5 pt-3">
              <Button
                size="lg"
                className="w-full"
                disabled={submitting || cart.length === 0}
                onClick={submit}
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Buyurtma berish
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
