# Tovar beruvchi (Suppliers) — functionality reference

Location: **Moliya → Tovar beruvchi**. Entry point: `MoliyaTabs.tsx` renders `<TovarBeruvchiTab>` when `tab === "tovar"`.

This tab manages suppliers/distributors: who you buy stock from, what you've bought, what you still owe them, and how much of your current warehouse stock came from each one.

---

## 1. Screen layout

### 1.1 Top of the page

- **"Chiqarilgan" stat card** — all-time total operating expenses (`GET /api/ledger?period=all` → `balances.expenses`). Not specific to suppliers; shared with the rest of Moliya's expense tracking.
- **"Qayd etilgan kirimlar" card** — portfolio totals across **all** suppliers, computed client-side from the supplier list (always all-time, no period filter):
  - Bold total: sum of every supplier's `totalAmount` (+ USD sum in parens if any).
  - 3-box grid: **Naqd** (sum of `cash`), **Karta** (sum of `card`), **Qarz** (sum of `debt`, formatted via `debtLabel()` — shows USD-only if the store's "show debt in USD only" setting is on and a rate is available, otherwise so'm).
- **"Yetkazib beruvchilar ro'yxati (N)"** header with two buttons:
  - **"Yetkazib beruvchi"** → opens a small modal to add a new supplier (name + optional phone). `POST /api/suppliers`.
  - **"Tovar kirimi"** → opens the goods-receipt modal (see §4) to record a new purchase.

### 1.2 Supplier cards

One card per supplier, in a responsive grid (`sm:grid-cols-2 lg:grid-cols-3`). Clicking a card expands it (spans the full row) to reveal its purchases panel; clicking again collapses it. Each card shows, **always all-time** (no period filter at this level):

- Avatar (first letter of name) + name + phone.
- `{distinctProducts} tovar, {totalUnits} birlik`.
- Bold total amount ever purchased (+ USD equivalent in parens, if any purchases were made in USD).
- Cash/Card breakdown line (only the non-zero ones are shown).
- **"Omborda qoldiq qiymati"** — current warehouse value of stock that came from this supplier (see §5.4 for the formula and its one known caveat).
- Debt row:
  - If debt > 0: a red badge "Qarz: X" (USD if the supplier has any USD-denominated debt, so'm otherwise, with a muted so'm sub-line when showing USD) + a **"To'lash"** button that opens `PaySupplierModal` for the whole supplier (not scoped to any particular date).
  - If debt = 0: a green "Qarzi yo'q" badge.

### 1.3 Expanded panel (per supplier)

Rendered by `SupplierPurchasesPanel`. Everything here **is** period-scoped (default period: "Oy" / this month):

- Period pills: Bugun / Hafta / Oy / Barchasi.
- A compact summary line for the selected period: total cost (+ USD), total units, distinct product count.
  - **Note**: these numbers are period-scoped and will *not* match the card's all-time totals unless "Barchasi" is selected.
- A scrollable table of purchases, **grouped by calendar date** (see §5.1):
  - One header row per date: the date + "N kun oldin" / "Bugun", the **combined outstanding debt for that whole date** (every product bought that day, summed) or "To'liq to'langan" if nothing's owed, a history icon, and a **"To'lash"** button scoped to just that date's receipts.
  - A history row (toggled by the clock icon) listing every payment ever made against that date's receipts: timestamp, method (naqd/karta), amount. Fetched lazily and cached per date-group; empty state says "To'lov tarixi yo'q".
  - One row per product purchased that day: name, payment-method badge(s) (Naqd/Karta/Nasiya — shows its own sub-amount only when a single purchase was split across more than one method), quantity, total cost (+ USD), and that **specific product's** remaining debt (or "—" if none).

---

## 2. Debt, by the numbers

There are **three different debt figures** shown in this tab, at three different granularities — all derived from the same underlying `GoodsReceipt` rows, but scoped differently:

| Shown where | Scope | Source |
|---|---|---|
| Supplier card | All-time, whole supplier | `GET /api/suppliers` |
| Date-group header | Period-scoped, one calendar day | `GET /api/suppliers/[id]/receipts` |
| Product row | Period-scoped, one product on one day | same response, nested |

Only **CREDIT** (Nasiya) purchases can ever carry debt. CASH and CARD purchases are treated as paid in full the moment they're recorded — their `totalCost` is immediately counted as "paid", and they generate an immediate `LedgerEntry` (see §4).

### 2.1 So'm debt
`debt = totalAmount - paid`, where `paid` = (for CASH/CARD receipts) their full `totalCost`, or (for CREDIT receipts) whatever `paidAmount` has accumulated so far from supplier payments.

### 2.2 USD debt (estimated vs. native)
Some purchases are priced in dollars natively (`currency: "usd"`, with their own `costUsd`/`paidUsd`/`usdRate` captured at purchase time); others are priced in so'm but the UI still wants to show a dollar-equivalent debt figure. The supplier-list endpoint computes `debtUsd` by combining both:

- **Native USD debt**: for `currency === "usd"` CREDIT receipts, `debtUsd += costUsd - paidUsd` directly — exact, no estimation.
- **Estimated USD debt**: for so'm CREDIT receipts, `debtUsd += dueSom / liveRate` (the live CBU/Telegram/manual rate from `getUsdRate()`), and `debtUsdEstimated` is flagged `true`. If no live rate is available at all, that portion is silently **not** added to `debtUsd` (it still counts toward the so'm `debt`, it just won't show up in the dollar figure).

The date-grouped receipts endpoint (used inside the expanded panel) does **not** do this live-rate estimation — its `debtUsd` only ever reflects genuinely USD-currency receipts. So a product/date row's USD debt can look smaller/absent compared to the card's all-time USD debt if some of the debt there is so'm-denominated.

---

## 3. Making a payment

Triggered from any "To'lash" button (card-level = whole supplier's oldest debt first; date-group-level = just that date's receipts). Opens `PaySupplierModal`.

1. On open, it fetches `GET /api/suppliers/[id]/debt?receiptIds=...` (omit `receiptIds` for the whole-supplier case) to get an accurate `{debtTotal, debtSom, debtUsd, debtUsdSomValue}` breakdown scoped to exactly the receipts being paid.
2. Two modes:
   - **So'mda** — pay a so'm amount directly.
   - **Dollarda** — if the targeted receipts have *any* real USD-currency debt, this pays that dollar pool natively (each receipt converted at **its own historical rate**, not today's rate). If there's no native dollar debt, "Dollarda" instead lets you enter a dollar amount + a conversion rate, converting it to so'm to pay down the so'm debt.
   - "Yarmi" / "Hammasi" quick-fill half or all of the remaining debt.
3. Submits to `POST /api/suppliers/[id]/pay`.

### 3.1 What the pay endpoint does

- Only touches `receiptIds` if given, otherwise all of the supplier's unpaid CREDIT receipts.
- Allocates the payment **oldest purchase first** (`orderBy: createdAt asc`), splitting across receipts until the amount is exhausted or clamping to the total available debt (so you can never overpay).
- For each receipt that received money this payment, increments its `paidAmount` (and `paidUsd` in native-dollar mode).
- Creates one `LedgerEntry` (direction OUT, category `"Tovar xaridi"`, so this shows up correctly in Moliya's expense breakdowns) for the total so'm amount paid.
- Creates one `SupplierPayment` row plus one `SupplierPaymentReceipt` row per receipt touched, recording exactly how much of this payment went to which receipt — this is what powers the payment-history list in the date-group table (§1.3).

---

## 4. Recording a new purchase ("Tovar kirimi")

`GoodsReceiptModal`, opened from the "Tovar kirimi" button. Fields: supplier (required), optional link to an existing warehouse product, product name, quantity, currency (So'm / Dollar), price, payment method (Naqd / Karta / Nasiya).

- In dollar mode, price is **per unit**; total cost = `round(perUnit × qty × liveOrManualRate)`. The rate field is pre-filled from the live rate (`GET /api/usd-rate`) with a hint showing its source (CBU / Telegram / manual), but can be overridden.
- Submits to `POST /api/goods-receipts`:
  - If a warehouse product was linked, its `stock` is incremented by `qty` immediately.
  - CASH/CARD purchases start with `paidAmount = totalCost` (fully paid) and immediately create a `LedgerEntry` (cash/card actually left the till now).
  - CREDIT purchases start with `paidAmount = 0` and create **no** ledger entry yet — the outflow is only recorded later, when the debt is actually paid off (§3.1).

---

## 5. Key formulas (exact)

### 5.1 Date grouping
```ts
function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
```
Groups by the **server's local calendar day** (not UTC, not per-product) — every receipt created on the same calendar date lands in the same group, regardless of time of day.

### 5.2 So'm debt (per supplier, all-time)
```ts
const paid = receipts.reduce(
  (sum, r) => sum + (r.paymentMethod === "CREDIT" ? r.paidAmount : r.totalCost),
  0
);
const debt = totalAmount - paid;
```

### 5.3 USD debt (per supplier, all-time — the one with live-rate estimation)
```ts
for (const r of receipts) {
  if (r.paymentMethod !== "CREDIT") continue;
  if (r.currency === "usd") {
    debtUsd += Math.max(0, (r.costUsd ?? 0) - r.paidUsd);
  } else {
    const dueSom = Math.max(0, r.totalCost - r.paidAmount);
    if (dueSom > 0 && rateInfo) {
      debtUsd += dueSom / rateInfo.rate;
      debtUsdEstimated = true;
    }
  }
}
```

### 5.4 Warehouse stock value ("Omborda qoldiq qiymati")
```ts
const supplierProductIds = new Set(receipts.map(r => r.productId).filter(Boolean));
const stockValue = [...supplierProductIds].reduce((sum, id) => {
  const p = productMap.get(id); // current Product row
  return sum + (p ? p.stock * p.costPrice : 0);
}, 0);
```
Same valuation basis as Ombor's "Jami tan narx" (current stock × current cost price). Counted once per **distinct product** ever linked to a receipt from this supplier — not per receipt, and not historically weighted.

**Known limitation**: a `Product` has no `supplierId` of its own — only `GoodsReceipt` does. If the same product were ever purchased from two different suppliers, its *entire* current stock value would be counted under both suppliers' cards (double-counted), because there's no per-batch/lot tracking of which supplier's units are still physically in stock. As of now, no product in this store has ever been sourced from more than one supplier, so the figure is exact in practice — but this assumption could break if that ever changes.

---

## 6. Data model

```
Supplier
  id, storeId, name, phone, createdAt
  → receipts: GoodsReceipt[]
  → payments: SupplierPayment[]

GoodsReceipt
  id, storeId, supplierId, productId?, productName, qty, totalCost,
  currency ("som"|"usd"), costUsd?, usdRate?, paymentMethod (CASH|CARD|CREDIT),
  paidAmount, paidUsd, createdAt
  → paymentAllocations: SupplierPaymentReceipt[]

SupplierPayment                        (one row per "To'lash" submission)
  id, storeId, supplierId, amount (so'm), method (CASH|CARD), paidUsd?, note, createdAt
  → receipts: SupplierPaymentReceipt[]

SupplierPaymentReceipt                 (join table: which receipts a payment covered)
  id, paymentId, receiptId, amount (so'm allocated to that specific receipt)
```

`Product.stock` / `Product.costPrice` are read (not written) by this tab except when a new receipt is linked to a product, which increments `stock`.

---

## 7. API endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/suppliers` | List all suppliers with all-time aggregates (totals, cash/card, debt, debtUsd, stockValue). |
| `POST /api/suppliers` | Create a supplier (`name` required, `phone` optional). |
| `GET /api/suppliers/[id]/receipts?period=` | Date-grouped, period-scoped purchase breakdown for the expanded panel. |
| `GET /api/suppliers/[id]/debt?receiptIds=` | Debt breakdown (som/usd) for a specific set of receipts (or all, if omitted) — feeds `PaySupplierModal`. |
| `POST /api/suppliers/[id]/pay` | Register a payment; allocates oldest-receipt-first, writes `LedgerEntry` + `SupplierPayment`/`SupplierPaymentReceipt`. |
| `GET /api/suppliers/[id]/payments?receiptIds=` | Payment history for a specific set of receipts (powers the date-group history toggle). |
| `POST /api/goods-receipts` | Record a new purchase ("Tovar kirimi"); increments product stock, creates a ledger entry immediately unless the payment method is CREDIT. |

All so'm/debt-related `LedgerEntry` rows created by this tab use `category: "Tovar xaridi"` (`SUPPLIER_PAYMENT_CATEGORY` in `src/lib/stats.ts`), which is how Moliya's expense reports distinguish goods-purchase cash outflows from other expense categories.
