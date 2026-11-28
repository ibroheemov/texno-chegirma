"use client";

import { useEffect, useMemo, useState } from "react";
import type { Customer } from "@prisma/client";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  Landmark,
  Loader2,
  Pencil,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { formatDateTime, formatSom } from "@/lib/format";
import { resolveMethodLabel } from "@/lib/receipt";
import type { CustomerRow } from "@/lib/types";

type StatusFilter = "all" | "debtors" | "paid" | "dueSoon";
type SortKey = "orders" | "spent" | "debt";

const PAGE_SIZE = 10;

type SaleRow = {
  id: string;
  createdAt: string;
  paymentMethod: string;
  customAmounts: Record<string, number> | null;
  total: number;
  canceled: boolean;
  items: { name: string; qty: number; price: number }[];
};

type SalesResponse = {
  sales: SaleRow[];
  totals: { ordersCount: number; totalSpent: number };
};

function pageList(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) result.push("gap");
    result.push(n);
  });
  return result;
}

function SortHead({
  label,
  sortKey,
  active,
  dir,
  onSort,
  right = true,
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey | null;
  dir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  right?: boolean;
}) {
  const isActive = active === sortKey;
  return (
    <th className={right ? "r" : undefined} aria-sort={isActive ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" className={`sort${isActive ? " is-sorted" : ""}`} onClick={() => onSort(sortKey)}>
        {label}
        {isActive ? (
          dir === "asc" ? (
            <ArrowUp className="ic" size={13} />
          ) : (
            <ArrowDown className="ic" size={13} />
          )
        ) : (
          <ArrowUpDown className="ic" size={13} />
        )}
      </button>
    </th>
  );
}

function debtBadge(c: CustomerRow) {
  if (c.debt > 0) {
    const tone = c.overdue ? "badge-danger" : c.dueSoon ? "badge-warning" : "badge-danger";
    const note = c.overdue ? " · muddati o‘tgan" : c.dueSoon ? " · muddati yaqin" : "";
    return (
      <span className={`badge ${tone}`}>
        <span className="bd" />
        {formatSom(c.debt)}
        {note}
      </span>
    );
  }
  return (
    <span className="badge badge-success">
      <span className="bd" />
      Qarzi yo‘q
    </span>
  );
}

export function CustomersPanel({
  customers,
  formOpen,
  onFormClose,
  onAdd,
}: {
  customers: CustomerRow[];
  /** Controlled by the page header "Mijoz qo'shish" button. */
  formOpen: boolean;
  onFormClose: () => void;
  onAdd: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<Customer | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomerRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [historyTarget, setHistoryTarget] = useState<CustomerRow | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (deleteTarget) setDeleteTarget(null);
      else if (editOpen || formOpen) closeForm();
      else if (historyTarget) setHistoryTarget(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteTarget, editOpen, formOpen, historyTarget]);

  const stats = useMemo(() => {
    const debtors = customers.filter((c) => c.debt > 0);
    return {
      total: customers.length,
      debtors: debtors.length,
      totalDebt: debtors.reduce((sum, c) => sum + c.debt, 0),
      dueSoon: customers.filter((c) => c.dueSoon).length,
    };
  }, [customers]);

  const tabs: [StatusFilter, string, number][] = [
    ["all", "Hammasi", stats.total],
    ["debtors", "Qarzdorlar", stats.debtors],
    ["paid", "To‘langan", stats.total - stats.debtors],
    ["dueSoon", "Muddati yaqin", stats.dueSoon],
  ];

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (status === "debtors" && c.debt <= 0) return false;
      if (status === "paid" && c.debt > 0) return false;
      if (status === "dueSoon" && !c.dueSoon) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.phone?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [customers, status, query]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const field = sortKey === "orders" ? "ordersCount" : sortKey === "spent" ? "totalSpent" : "debt";
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => (a[field] - b[field]) * dir);
  }, [filtered, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeFrom = sorted.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeTo = Math.min(sorted.length, currentPage * PAGE_SIZE);
  const anyFilter = status !== "all" || query !== "";

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  }

  function resetFilters() {
    setQuery("");
    setStatus("all");
    setPage(1);
  }

  function closeForm() {
    setEditOpen(false);
    setEditing(null);
    onFormClose();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteError("");
    setDeleting(true);
    const res = await fetch(`/api/customers/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteTarget(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setDeleteError(data.error ?? "Xatolik yuz berdi");
      return;
    }
    router.refresh();
  }

  const formVisible = formOpen || editOpen;

  return (
    <>
      <div className="mj-kpis">
        <div className="card kpi mj-kpi">
          <span className="ic-tile">
            <Users className="ic" size={20} />
          </span>
          <div className="mj-kpi-body">
            <span className="kpi-label">Jami mijozlar</span>
            <span className="kpi-val">{stats.total}</span>
          </div>
        </div>
        <div className="card kpi mj-kpi">
          <span className="ic-tile danger">
            <AlertCircle className="ic" size={20} />
          </span>
          <div className="mj-kpi-body">
            <span className="kpi-label">Qarzdorlar</span>
            <span className="kpi-val">{stats.debtors}</span>
          </div>
        </div>
        <div className="card kpi mj-kpi">
          <span className="ic-tile warning">
            <Landmark className="ic" size={20} />
          </span>
          <div className="mj-kpi-body">
            <span className="kpi-label">Jami qarz</span>
            <span className="kpi-val">{formatSom(stats.totalDebt)}</span>
          </div>
        </div>
        <div className="card kpi mj-kpi">
          <span className="ic-tile info">
            <Clock className="ic" size={20} />
          </span>
          <div className="mj-kpi-body">
            <span className="kpi-label">Muddati yaqin</span>
            <span className="kpi-val">{stats.dueSoon}</span>
          </div>
        </div>
      </div>

      <div className="card mj-card">
        <div className="tabs mj-tabs" role="tablist" aria-label="Qarz holati bo‘yicha">
          {tabs.map(([key, label, count]) => (
            <button
              type="button"
              key={key}
              role="tab"
              aria-selected={status === key}
              className={`tab${status === key ? " is-active" : ""}`}
              onClick={() => {
                setStatus(key);
                setPage(1);
              }}
            >
              {label}
              <span className="count count-soft">{count}</span>
            </button>
          ))}
        </div>

        <div className="tbl-bar">
          <div className="control control-sm mj-search">
            <Search className="ic" size={16} />
            <input
              placeholder="Ism yoki telefon bo‘yicha qidirish…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              aria-label="Mijoz qidirish"
            />
          </div>
          {anyFilter && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={resetFilters}>
              <X className="ic" size={14} />
              Tozalash
            </button>
          )}
          <span className="grow" />
          <button type="button" className="btn btn-primary btn-sm" onClick={onAdd}>
            <Plus className="ic" size={16} />
            Mijoz qo‘shish
          </button>
        </div>

        {deleteError && (
          <p className="mj-error" role="alert">
            {deleteError}
          </p>
        )}

        {sorted.length === 0 ? (
          <div className="empty">
            <span className="em-ic">
              <Users className="ic" size={28} />
            </span>
            <h4>Mijoz topilmadi</h4>
            <p>Qidiruv yoki filtrni o‘zgartiring.</p>
            {anyFilter && (
              <div className="acts">
                <button type="button" className="btn btn-outline" onClick={resetFilters}>
                  Filtrlarni tozalash
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl mj-tbl">
              <thead>
                <tr>
                  <th>Mijoz</th>
                  <th>Telefon</th>
                  <th>Manzil</th>
                  <SortHead label="Buyurtmalar" sortKey="orders" active={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHead label="Jami xaridlar" sortKey="spent" active={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHead
                    label="Nasiya qarzi"
                    sortKey="debt"
                    active={sortKey}
                    dir={sortDir}
                    onSort={toggleSort}
                    right={false}
                  />
                  <th className="r">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="mj-person">
                        <span className="av av-sm">{c.name.slice(0, 1).toUpperCase()}</span>
                        <b>{c.name}</b>
                      </div>
                    </td>
                    <td className="mj-muted">
                      {c.phone ? (
                        <span className="mj-inline mono">
                          <Phone className="ic" size={13} />
                          {c.phone}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="mj-muted mj-wrap">{c.address || "—"}</td>
                    <td className="r mono strong">{c.ordersCount}</td>
                    <td className="r mono strong">{formatSom(c.totalSpent)}</td>
                    <td>{debtBadge(c)}</td>
                    <td>
                      <div className="mj-actions">
                        <button
                          type="button"
                          className="row-act"
                          onClick={() => setHistoryTarget(c)}
                          aria-label="Xaridlar tarixi"
                          title="Xaridlar tarixi"
                        >
                          <History className="ic" size={16} />
                        </button>
                        <button
                          type="button"
                          className="row-act"
                          onClick={() => {
                            setEditing(c);
                            setEditOpen(true);
                          }}
                          aria-label="Tahrirlash"
                          title="Tahrirlash"
                        >
                          <Pencil className="ic" size={16} />
                        </button>
                        <button
                          type="button"
                          className="row-act is-danger"
                          onClick={() => setDeleteTarget(c)}
                          aria-label="O‘chirish"
                          title="O‘chirish"
                        >
                          <Trash2 className="ic" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="tbl-foot">
          <span>
            {sorted.length === 0 ? "0 ta mijoz" : `${rangeFrom}–${rangeTo} / ${sorted.length} ta mijoz`}
          </span>
          {pageCount > 1 && (
            <nav className="pager" aria-label="Sahifalar">
              <button
                type="button"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage <= 1}
                aria-label="Oldingi sahifa"
              >
                <ChevronLeft className="ic" size={16} />
              </button>
              {pageList(currentPage, pageCount).map((entry, index) =>
                entry === "gap" ? (
                  <span key={`gap-${index}`} className="gap">
                    …
                  </span>
                ) : (
                  <button
                    type="button"
                    key={entry}
                    className={entry === currentPage ? "is-active" : ""}
                    aria-current={entry === currentPage ? "page" : undefined}
                    onClick={() => setPage(entry)}
                  >
                    {entry}
                  </button>
                )
              )}
              <button
                type="button"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= pageCount}
                aria-label="Keyingi sahifa"
              >
                <ChevronRight className="ic" size={16} />
              </button>
            </nav>
          )}
        </div>
      </div>

      {formVisible && (
        <CustomerForm
          customer={editing}
          onClose={closeForm}
          onSaved={() => {
            closeForm();
            router.refresh();
          }}
        />
      )}

      {historyTarget && <PurchasesDrawer customer={historyTarget} onClose={() => setHistoryTarget(null)} />}

      {deleteTarget && (
        <div className="mj-overlay mj-overlay-modal" onClick={() => setDeleteTarget(null)}>
          <div
            className="modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="mj-delete-title"
            style={{ maxWidth: 440 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-b mj-confirm-body">
              <span className="ic-tile lg danger">
                <Trash2 className="ic" size={22} />
              </span>
              <h3 className="t-h3" id="mj-delete-title">
                Mijozni o‘chirasizmi?
              </h3>
              <p className="t-body-sm">
                «{deleteTarget.name}» mijozlar ro‘yxatidan o‘chiriladi. Bu amalni ortga qaytarib bo‘lmaydi.
              </p>
            </div>
            <div className="modal-f">
              <button type="button" className="btn btn-outline" onClick={() => setDeleteTarget(null)}>
                Bekor qilish
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>
                {deleting && <Loader2 className="ic" size={16} />}
                O‘chirish
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CustomerForm({
  customer,
  onClose,
  onSaved,
}: {
  customer: Customer | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [note, setNote] = useState(customer?.note ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name) {
      setError("Ismni kiriting");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch(customer ? `/api/customers/${customer.id}` : "/api/customers", {
      method: customer ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, address, note }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }
    onSaved();
  }

  return (
    <div className="mj-overlay mj-overlay-modal" onClick={onClose}>
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mj-form-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <div className="modal-h">
          <h3 id="mj-form-title">{customer ? "Mijozni tahrirlash" : "Yangi mijoz"}</h3>
          <button type="button" className="x-btn" onClick={onClose} aria-label="Yopish">
            <X className="ic" size={18} />
          </button>
        </div>
        <div className="modal-b">
          <label className="field">
            <span className="label">
              Ism familiya <span className="req">*</span>
            </span>
            <span className={`control${error && !name ? " is-error" : ""}`}>
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Masalan: Farxod aka"
              />
            </span>
          </label>
          <label className="field">
            <span className="label">Telefon raqami</span>
            <span className="control">
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+998 90 123 45 67"
              />
            </span>
          </label>
          <label className="field">
            <span className="label">MFY (Manzil)</span>
            <span className="control">
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Masalan: Chilonzor MFY"
              />
            </span>
          </label>
          <label className="field">
            <span className="label">Izoh</span>
            <span className="control">
              <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Qo‘shimcha izoh" />
            </span>
          </label>
          {error && (
            <p className="mj-form-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="modal-f">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Bekor qilish
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <Loader2 className="ic" size={16} />}
            Saqlash
          </button>
        </div>
      </form>
    </div>
  );
}

function PurchasesDrawer({ customer, onClose }: { customer: CustomerRow; onClose: () => void }) {
  const [data, setData] = useState<SalesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/customers/${customer.id}/sales`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customer.id]);

  return (
    <div className="mj-overlay" onClick={onClose}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Xaridlar tarixi"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="drawer-h">
          <span className="av">{customer.name.slice(0, 1).toUpperCase()}</span>
          <div className="mj-drawer-title">
            <b>{customer.name}</b>
            <span className="t-caption">Xaridlar tarixi{customer.phone ? ` · ${customer.phone}` : ""}</span>
          </div>
          <button type="button" className="x-btn" onClick={onClose} aria-label="Yopish">
            <X className="ic" size={18} />
          </button>
        </div>
        <div className="drawer-b">
          {loading && !data ? (
            <div className="mj-loading">
              <span className="spinner spinner-lg" role="status" aria-label="Yuklanmoqda" />
            </div>
          ) : data ? (
            <>
              <div className="mj-drawer-panels">
                <div className="panel">
                  <span className="t-caption">Buyurtmalar</span>
                  <b className="mono strong mj-panel-val">{data.totals.ordersCount}</b>
                </div>
                <div className="panel">
                  <span className="t-caption">Jami xaridlar</span>
                  <b className="mono strong mj-panel-val">{formatSom(data.totals.totalSpent)}</b>
                </div>
              </div>

              {data.sales.length === 0 ? (
                <div className="empty">
                  <span className="em-ic">
                    <ShoppingBag className="ic" size={28} />
                  </span>
                  <h4>Xarid yo‘q</h4>
                  <p>Bu mijoz hali xarid qilmagan.</p>
                </div>
              ) : (
                <div className="mj-sales">
                  {data.sales.map((s) => (
                    <div key={s.id} className="mj-sale">
                      <div className="mj-sale-top">
                        <div className="mj-sale-meta">
                          <span>{formatDateTime(new Date(s.createdAt))}</span>
                          <span>·</span>
                          <span>{resolveMethodLabel(s.paymentMethod, s.customAmounts)}</span>
                          {s.canceled && (
                            <span className="badge badge-danger badge-sm">
                              <span className="bd" />
                              Bekor qilingan
                            </span>
                          )}
                        </div>
                        <span className={`mono mj-sale-total${s.canceled ? " is-canceled" : ""}`}>
                          {formatSom(s.total)}
                        </span>
                      </div>
                      <div>
                        {s.items.map((item, idx) => (
                          <div key={idx} className="mj-sale-line">
                            <span>
                              {item.name} × {item.qty}
                            </span>
                            <span className="mono">{formatSom(item.price * item.qty)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
