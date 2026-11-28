"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  FileText,
  HandCoins,
  Loader2,
  Pencil,
  Plus,
  Search,
  User,
  X,
} from "lucide-react";
import { formatSom } from "@/lib/format";
import { todayYmd, type DebtRow, type DebtStatus } from "@/lib/debtBook";
import "./qarz-daftari.css";

type Filter = "all" | "open" | "overdue" | "paid" | "canceled";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Hammasi" },
  { key: "open", label: "Ochiq" },
  { key: "overdue", label: "Muddati o‘tgan" },
  { key: "paid", label: "To‘langan" },
  { key: "canceled", label: "Bekor qilingan" },
];

const STATUS_LABEL: Record<DebtStatus, string> = {
  PENDING: "Kutilmoqda",
  OVERDUE: "Muddati o‘tgan",
  PAID: "To‘langan",
  CANCELED: "Bekor qilingan",
};

const STATUS_BADGE: Record<DebtStatus, string> = {
  PENDING: "badge-info",
  OVERDUE: "badge-danger",
  PAID: "badge-success",
  CANCELED: "badge-outline",
};

function matchesFilter(row: DebtRow, filter: Filter) {
  switch (filter) {
    case "open":
      return row.status === "PENDING" || row.status === "OVERDUE";
    case "overdue":
      return row.status === "OVERDUE";
    case "paid":
      return row.status === "PAID";
    case "canceled":
      return row.status === "CANCELED";
    default:
      return true;
  }
}

const digits = (value: string) => value.replace(/\D/g, "");

function matchesQuery(row: DebtRow, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (row.debtorName.toLowerCase().includes(q) || row.item.toLowerCase().includes(q)) return true;
  const raw = row.phone?.toLowerCase() ?? "";
  if (raw.includes(q)) return true;
  const qDigits = digits(q);
  return qDigits.length > 0 && digits(raw).includes(qDigits);
}

type Modal =
  | { kind: "create" }
  | { kind: "edit"; id: string }
  | { kind: "pay"; id: string }
  | { kind: "cancel"; id: string }
  | null;

export function QarzDaftariView({ rows }: { rows: DebtRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);

  const stats = useMemo(() => {
    const counted = rows.filter((r) => r.status !== "CANCELED");
    const open = counted.filter((r) => r.status === "PENDING" || r.status === "OVERDUE");
    return {
      total: counted.reduce((sum, r) => sum + r.totalAmount, 0),
      remaining: open.reduce((sum, r) => sum + r.remaining, 0),
      open: open.length,
      overdue: open.filter((r) => r.status === "OVERDUE").length,
    };
  }, [rows]);

  const visible = useMemo(() => rows.filter((r) => matchesFilter(r, filter) && matchesQuery(r, query)), [rows, filter, query]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;
  const modalRow = modal && modal.kind !== "create" ? (rows.find((r) => r.id === modal.id) ?? null) : null;

  // Escape closes the top-most layer: the dialog first, then the drawer.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (modal) setModal(null);
      else if (selectedId) setSelectedId(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modal, selectedId]);

  function refreshAnd(after?: () => void) {
    router.refresh();
    after?.();
  }

  return (
    <>
      <div className="qd-head">
        <div className="page-h">
          <div className="ttl">
            <span className="t-overline" style={{ color: "var(--primary-text)" }}>
              Qarz daftari
            </span>
            <h1 className="t-h1">Mustaqil nasiya</h1>
            <p className="t-body-sm">Do‘kon tashqarisidagi qarzlarni tez va aniq nazorat qiling.</p>
          </div>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setModal({ kind: "create" })}>
          <Plus className="ic" size={16} />
          Qarz qo‘shish
        </button>
      </div>

      <div className="qd-kpis">
        <Kpi icon={<CircleDollarSign className="ic" size={20} />} tone="" label="Jami qarz" value={formatSom(stats.total)} />
        <Kpi icon={<HandCoins className="ic" size={20} />} tone="danger" label="Qoldiq" value={formatSom(stats.remaining)} />
        <Kpi icon={<FileText className="ic" size={20} />} tone="warning" label="Ochiq yozuvlar" value={String(stats.open)} />
        <Kpi icon={<AlertTriangle className="ic" size={20} />} tone="accent" label="Muddati o‘tgan" value={String(stats.overdue)} />
      </div>

      <div className="card qd-card">
        <div className="tbl-bar qd-bar">
          <div className="control control-sm qd-search">
            <Search className="ic" size={16} />
            <input
              placeholder="Ism, telefon yoki mahsulot bo‘yicha qidiring"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Qarzlarni qidirish"
            />
          </div>
          <span className="grow" />
          <div className="seg seg-sm" role="tablist" aria-label="Holat bo‘yicha">
            {FILTERS.map(({ key, label }) => (
              <button
                type="button"
                key={key}
                role="tab"
                aria-selected={filter === key}
                className={filter === key ? "is-active" : ""}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="empty">
            <span className="em-ic">
              <HandCoins className="ic" size={28} />
            </span>
            {rows.length === 0 ? (
              <>
                <h4>Hali qarz yozuvi yo‘q</h4>
                <p>“Qarz qo‘shish” tugmasi orqali birinchi yozuvni kiriting.</p>
              </>
            ) : (
              <>
                <h4>Qidiruv bo‘yicha yozuv topilmadi</h4>
                <p>Filter yoki qidiruv so‘zini o‘zgartiring.</p>
              </>
            )}
          </div>
        ) : (
          <ul className="qd-list">
            {visible.map((row) => (
              <li key={row.id}>
                <DebtListRow row={row} onOpen={() => setSelectedId(row.id)} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <DebtDrawer
          row={selected}
          onClose={() => setSelectedId(null)}
          onPay={() => setModal({ kind: "pay", id: selected.id })}
          onEdit={() => setModal({ kind: "edit", id: selected.id })}
          onCancel={() => setModal({ kind: "cancel", id: selected.id })}
        />
      )}

      {modal?.kind === "create" && (
        <DebtFormModal
          onClose={() => setModal(null)}
          onSaved={() => refreshAnd(() => setModal(null))}
        />
      )}
      {modal?.kind === "edit" && modalRow && (
        <DebtFormModal
          row={modalRow}
          onClose={() => setModal(null)}
          onSaved={() => refreshAnd(() => setModal(null))}
        />
      )}
      {modal?.kind === "pay" && modalRow && (
        <PayModal row={modalRow} onClose={() => setModal(null)} onSaved={() => refreshAnd(() => setModal(null))} />
      )}
      {modal?.kind === "cancel" && modalRow && (
        <CancelModal
          row={modalRow}
          onClose={() => setModal(null)}
          onDone={() => refreshAnd(() => setModal(null))}
        />
      )}
    </>
  );
}

function Kpi({ icon, tone, label, value }: { icon: React.ReactNode; tone: string; label: string; value: string }) {
  return (
    <div className="card kpi qd-kpi">
      <span className={`ic-tile ${tone}`}>{icon}</span>
      <div className="qd-kpi-body">
        <span className="kpi-label">{label}</span>
        <span className="kpi-val">{value}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: DebtStatus }) {
  return (
    <span className={`badge badge-sm ${STATUS_BADGE[status]}`}>
      <span className="bd" />
      {STATUS_LABEL[status]}
    </span>
  );
}

function DebtListRow({ row, onOpen }: { row: DebtRow; onOpen: () => void }) {
  const overdue = row.status === "OVERDUE";
  return (
    <button type="button" className="qd-row" onClick={onOpen}>
      <span className={`ic-tile ${overdue ? "danger" : "success"}`}>
        <User className="ic" size={20} />
      </span>
      <span className="qd-row-main">
        <span className="qd-row-title">
          <b>{row.debtorName}</b>
          <StatusBadge status={row.status} />
        </span>
        <span className="qd-row-sub">
          {row.item}
          {row.phone ? ` · ${row.phone}` : ""}
        </span>
      </span>
      <span className="qd-row-amt">
        <b className={`mono${row.status === "CANCELED" ? " is-canceled" : ""}`}>{formatSom(row.remaining)}</b>
        <small className={overdue ? "is-danger" : ""}>{overdue ? "Muddati o‘tgan" : row.dueDate}</small>
      </span>
      <ChevronRight className="ic qd-row-chev" size={18} />
    </button>
  );
}

function DebtDrawer({
  row,
  onClose,
  onPay,
  onEdit,
  onCancel,
}: {
  row: DebtRow;
  onClose: () => void;
  onPay: () => void;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const overdue = row.status === "OVERDUE";
  const open = row.status === "PENDING" || row.status === "OVERDUE";
  const progress = row.totalAmount > 0 ? Math.min(100, Math.round((row.paidAmount / row.totalAmount) * 100)) : 0;
  const canceled = row.status === "CANCELED";

  return (
    <div className="qd-overlay" onClick={onClose}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Qarz yozuvi"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="drawer-h">
          <div className="qd-drawer-title">
            <b>{row.debtorName}</b>
            {row.phone && <span className="t-caption">{row.phone}</span>}
          </div>
          <StatusBadge status={row.status} />
          <button type="button" className="x-btn" onClick={onClose} aria-label="Yopish">
            <X className="ic" size={18} />
          </button>
        </div>

        <div className="drawer-b">
          <div className="panel qd-balance">
            <span className="t-overline" style={{ color: "var(--primary-text)" }}>
              Qoldiq summa
            </span>
            <b className="mono qd-balance-val">{formatSom(row.remaining)}</b>
            <div className="prog">
              <i className="success" style={{ width: `${progress}%` }} />
            </div>
            <div className="qd-balance-foot">
              <span>Jami {formatSom(row.totalAmount)}</span>
              <span>To‘langan {formatSom(row.paidAmount)}</span>
            </div>
          </div>

          <section className="qd-section">
            <h4 className="t-overline">Kelishuv</h4>
            <div className="panel qd-deal">
              <b>{row.item}</b>
              <span className={`qd-deal-date${overdue ? " is-danger" : ""}`}>
                <CalendarDays className="ic" size={16} />
                {overdue ? `Muddati o‘tgan · ${row.dueDate}` : `Muddat: ${row.dueDate}`}
              </span>
              {row.note && <p className="qd-deal-note">{row.note}</p>}
            </div>
          </section>

          {open && (
            <button type="button" className="btn btn-primary btn-lg btn-block" onClick={onPay}>
              <CircleDollarSign className="ic" size={18} />
              To‘lov qayd etish
            </button>
          )}

          <section className="qd-section">
            <div className="qd-section-h">
              <h4 className="t-overline">To‘lovlar tarixi</h4>
              <span className="t-caption">{row.payments.length} ta</span>
            </div>
            {row.payments.length === 0 ? (
              <div className="panel qd-empty-pay">Hali to‘lov qayd etilmagan</div>
            ) : (
              <ul className="qd-pay-list">
                {[...row.payments].reverse().map((payment) => (
                  <li key={payment.id} className="panel qd-pay">
                    <div>
                      <b className="mono qd-pay-amt">+ {formatSom(payment.amount)}</b>
                      <span className="t-caption">
                        {payment.date} · {payment.note ?? "Naqd"}
                      </span>
                    </div>
                    <Check className="ic qd-pay-check" size={18} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {!canceled && (
          <div className="drawer-f qd-drawer-f">
            <button type="button" className="btn btn-outline" onClick={onEdit}>
              <Pencil className="ic" size={16} />
              Tahrirlash
            </button>
            <button type="button" className="btn btn-danger-soft" onClick={onCancel}>
              <X className="ic" size={16} />
              Bekor qilish
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

function ModalFrame({
  title,
  onClose,
  onSubmit,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="qd-overlay qd-overlay-modal" onClick={onClose}>
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="modal-h">
          <h3>{title}</h3>
          <button type="button" className="x-btn" onClick={onClose} aria-label="Yopish">
            <X className="ic" size={18} />
          </button>
        </div>
        <div className="modal-b">{children}</div>
        <div className="modal-f">{footer}</div>
      </form>
    </div>
  );
}

async function send(url: string, method: string, body?: unknown): Promise<string | null> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return data.error ?? "Xatolik yuz berdi";
}

function DebtFormModal({ row, onClose, onSaved }: { row?: DebtRow; onClose: () => void; onSaved: () => void }) {
  const [debtorName, setDebtorName] = useState(row?.debtorName ?? "");
  const [phone, setPhone] = useState(row?.phone ?? "");
  const [item, setItem] = useState(row?.item ?? "");
  const [totalAmount, setTotalAmount] = useState(row ? String(row.totalAmount) : "");
  const [dueDate, setDueDate] = useState(row?.dueDate ?? "");
  const [note, setNote] = useState(row?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    const failure = await send(row ? `/api/debt-book/${row.id}` : "/api/debt-book", row ? "PATCH" : "POST", {
      debtorName,
      phone,
      item,
      totalAmount: Number(totalAmount),
      dueDate,
      note,
    });
    setSaving(false);
    if (failure) {
      setError(failure);
      return;
    }
    onSaved();
  }

  return (
    <ModalFrame
      title={row ? "Qarz yozuvini tahrirlash" : "Yangi qarz yozuvi"}
      onClose={onClose}
      onSubmit={save}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Bekor qilish
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <Loader2 className="ic" size={16} />}
            Saqlash
          </button>
        </>
      }
    >
      <div className="qd-form-grid">
        <label className="field">
          <span className="label">
            Qarzdor ismi <span className="req">*</span>
          </span>
          <span className="control">
            <input
              autoFocus
              required
              value={debtorName}
              onChange={(event) => setDebtorName(event.target.value)}
              placeholder="Masalan, Dilshod Karimov"
            />
          </span>
        </label>
        <label className="field">
          <span className="label">Telefon</span>
          <span className="control">
            <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+998 90 000 00 00" />
          </span>
        </label>
      </div>
      <label className="field">
        <span className="label">
          Nima olingan? <span className="req">*</span>
        </span>
        <span className="control">
          <input required value={item} onChange={(event) => setItem(event.target.value)} placeholder="Mahsulot yoki xizmat" />
        </span>
      </label>
      <div className="qd-form-grid">
        <label className="field">
          <span className="label">
            Jami summa <span className="req">*</span>
          </span>
          <span className="control">
            <input
              required
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={totalAmount}
              onChange={(event) => setTotalAmount(event.target.value)}
              placeholder="0"
            />
          </span>
        </label>
        <label className="field">
          <span className="label">
            Qaytarish muddati <span className="req">*</span>
          </span>
          <span className="control">
            <input required type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </span>
        </label>
      </div>
      <label className="field">
        <span className="label">Izoh</span>
        <span className="control qd-textarea">
          <textarea
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Qo‘shimcha kelishuv yoki eslatma"
          />
        </span>
      </label>
      {error && (
        <p className="qd-form-error" role="alert">
          {error}
        </p>
      )}
    </ModalFrame>
  );
}

function PayModal({ row, onClose, onSaved }: { row: DebtRow; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => todayYmd());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    const failure = await send(`/api/debt-book/${row.id}/pay`, "POST", { amount: Number(amount), date, note });
    setSaving(false);
    if (failure) {
      setError(failure);
      return;
    }
    onSaved();
  }

  return (
    <ModalFrame
      title="To‘lov qayd etish"
      onClose={onClose}
      onSubmit={save}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Bekor qilish
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <Loader2 className="ic" size={16} />}
            Saqlash
          </button>
        </>
      }
    >
      <p className="qd-pay-hint">
        {row.debtorName} · qoldiq <b className="mono">{formatSom(row.remaining)}</b>
      </p>
      <label className="field">
        <span className="label">
          To‘lov summasi <span className="req">*</span>
        </span>
        <span className="control">
          <input
            autoFocus
            required
            type="number"
            min={1}
            max={row.remaining}
            step={1}
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0"
          />
        </span>
        <button type="button" className="btn btn-link btn-sm qd-fill" onClick={() => setAmount(String(row.remaining))}>
          Qoldiqni to‘liq to‘lash
        </button>
      </label>
      <div className="qd-form-grid">
        <label className="field">
          <span className="label">To‘lov sanasi</span>
          <span className="control">
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </span>
        </label>
        <label className="field">
          <span className="label">Izoh</span>
          <span className="control">
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Masalan: naqd" />
          </span>
        </label>
      </div>
      {error && (
        <p className="qd-form-error" role="alert">
          {error}
        </p>
      )}
    </ModalFrame>
  );
}

function CancelModal({ row, onClose, onDone }: { row: DebtRow; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setBusy(true);
    setError("");
    const failure = await send(`/api/debt-book/${row.id}/cancel`, "POST");
    setBusy(false);
    if (failure) {
      setError(failure);
      return;
    }
    onDone();
  }

  return (
    <ModalFrame
      title="Qarz yozuvini bekor qilasizmi?"
      onClose={onClose}
      onSubmit={confirm}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Yo‘q
          </button>
          <button type="submit" className="btn btn-danger" disabled={busy}>
            {busy && <Loader2 className="ic" size={16} />}
            Ha, bekor qilish
          </button>
        </>
      }
    >
      <p className="qd-pay-hint">
        <b>{row.debtorName}</b> · {row.item}. Yozuv “Bekor qilingan” bo‘limiga o‘tadi va jami hisobga kirmaydi.
      </p>
      {error && (
        <p className="qd-form-error" role="alert">
          {error}
        </p>
      )}
    </ModalFrame>
  );
}
