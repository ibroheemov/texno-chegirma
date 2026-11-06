"use client";

import { useMemo, useState } from "react";
import type { Category, Product } from "@prisma/client";
import { ShoppingCart, Plus, Minus, Trash2, Loader2, CheckCircle2, Search } from "lucide-react";
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
}: {
  products: ProductWithCategory[];
  categories: Category[];
}) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (categoryId && p.categoryId !== categoryId) return false;
      if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [products, categoryId, query]);

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
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD">("CASH");
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
        paymentMethod,
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
    setPaymentMethod("CASH");
    setSuccess(true);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-sm flex-col bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Savatcha</h2>
          <button onClick={onClose} className="text-muted">
            ✕
          </button>
        </div>

        {success ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <CheckCircle2 size={40} className="text-accent" />
            <p className="text-sm font-semibold">Buyurtma qabul qilindi!</p>
            <p className="text-xs text-muted">Tez orada siz bilan bog&apos;lanamiz</p>
            <Button size="sm" onClick={onClose}>
              Yopish
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
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
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-dashed border-border pt-3 text-base">
              <span className="font-semibold">JAMI</span>
              <span className="font-bold text-accent">{formatSom(total)}</span>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <Field label="Ismingiz">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Telefon raqamingiz">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" />
              </Field>
              <Field label="Yetkazib berish manzili (ixtiyoriy)">
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Mahalla, ko'cha, uy..." />
              </Field>
              <Field label="To'lov usuli">
                <div className="grid grid-cols-2 gap-2">
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
                </div>
              </Field>
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button size="lg" disabled={submitting || cart.length === 0} onClick={submit}>
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
