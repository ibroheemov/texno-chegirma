"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ChevronDown,
  Clock,
  History,
  Landmark,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { RfModal } from "../RfModal";
import { CustomerFormModal } from "./CustomerFormModal";
import { CustomerHistoryModal } from "./CustomerHistoryModal";
import { SegmentBadge, avClass, initials, readError } from "./shared";
import { formatNumber, formatSom } from "@/lib/format";
import { tierFor, type LoyaltyTier } from "@/lib/customerSegments";
import type { NdCustomerRow, SegmentRef } from "@/lib/customerRows";

type StatusFilter = "all" | "debtors" | "paid" | "dueSoon";
type SortKey = "name-asc" | "name-desc" | "orders-desc" | "spent-desc" | "debt-desc" | "recent";

const SORT_OPTIONS: [SortKey, string][] = [
  ["name-asc", "Ism: A → Z"],
  ["name-desc", "Ism: Z → A"],
  ["spent-desc", "Xaridlar: ko‘pdan kamga"],
  ["orders-desc", "Buyurtmalar: ko‘pdan kamga"],
  ["debt-desc", "Qarz: ko‘pdan kamga"],
  ["recent", "Oxirgi xarid: yangilari"],
];

export function BarchaMijozlarView({
  customers,
  groups,
  tags,
  tiers,
  initialGroup = "",
  initialTag = "",
}: {
  customers: NdCustomerRow[];
  groups: SegmentRef[];
  tags: SegmentRef[];
  /** Loyalty tiers when the program is on, else null. */
  tiers: LoyaltyTier[] | null;
  initialGroup?: string;
  initialTag?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [groupFilter, setGroupFilter] = useState(initialGroup);
  const [tagFilter, setTagFilter] = useState(initialTag);
  const [sortKey, setSortKey] = useState<SortKey>("name-asc");

  const [formTarget, setFormTarget] = useState<NdCustomerRow | "new" | null>(null);
  const [historyTarget, setHistoryTarget] = useState<NdCustomerRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NdCustomerRow | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const stats = useMemo(() => {
    const debtors = customers.filter((c) => c.debt > 0);
    return {
      total: customers.length,
      debtors: debtors.length,
      totalDebt: debtors.reduce((sum, c) => sum + c.debt, 0),
      dueSoon: customers.filter((c) => c.dueSoon).length,
      overdue: customers.filter((c) => c.overdue).length,
    };
  }, [customers]);

  const statusCounts: Record<StatusFilter, number> = {
    all: stats.total,
    debtors: stats.debtors,
    paid: stats.total - stats.debtors,
    dueSoon: stats.dueSoon,
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = customers.filter((c) => {
      if (status === "debtors" && c.debt <= 0) return false;
      if (status === "paid" && c.debt > 0) return false;
      if (status === "dueSoon" && !c.dueSoon) return false;
      if (groupFilter === "none" ? c.group : groupFilter && c.group?.id !== groupFilter) return false;
      if (tagFilter && !c.tags.some((t) => t.id === tagFilter)) return false;
      if (q && !c.name.toLowerCase().includes(q) && !c.phone?.toLowerCase().includes(q)) return false;
      return true;
    });
    list.sort((a, b) => {
      switch (sortKey) {
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "orders-desc":
          return b.ordersCount - a.ordersCount;
        case "spent-desc":
          return b.totalSpent - a.totalSpent;
        case "debt-desc":
          return b.debt - a.debt;
        case "recent":
          return (b.lastPurchaseAt ?? "").localeCompare(a.lastPurchaseAt ?? "");
        default:
          return a.name.localeCompare(b.name);
      }
    });
    return list;
  }, [customers, status, groupFilter, tagFilter, query, sortKey]);

  const anyFilter = !!(query || groupFilter || tagFilter || status !== "all");

  function resetFilters() {
    setQuery("");
    setGroupFilter("");
    setTagFilter("");
    setStatus("all");
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    const res = await fetch(`/api/customers/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      setDeleteError(await readError(res));
      return;
    }
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <>
      <div className="page-h">
        <div className="ttl">
          <span className="t-overline" style={{ color: "var(--primary-text)" }}>
            Mijozlar
          </span>
          <h1 className="t-h1">Barcha mijozlar</h1>
          <p className="t-body-sm">Mijozlar ro‘yxati, xaridlar tarixi va nasiya holati.</p>
        </div>
        <div className="acts">
          <button type="button" className="btn btn-primary" onClick={() => setFormTarget("new")}>
            <Plus className="ic" size={18} />
            Mijoz qo‘shish
          </button>
        </div>
      </div>

      <div className="mj-kpis">
        <div className="card kpi mj-kpi">
          <span className="ic-tile">
            <Users className="ic" size={20} />
          </span>
          <div className="mj-kpi-body">
            <span className="kpi-label">Jami mijozlar</span>
            <span className="kpi-val">{stats.total}</span>
            <span className="kpi-foot">Do‘kondagi barcha mijozlar</span>
          </div>
        </div>
        <div className="card kpi mj-kpi">
          <span className="ic-tile danger">
            <AlertCircle className="ic" size={20} />
          </span>
          <div className="mj-kpi-body">
            <span className="kpi-label">Qarzdorlar</span>
            <span className="kpi-val">{stats.debtors}</span>
            <span className="kpi-foot">{stats.overdue > 0 ? `${stats.overdue} tasida muddat o‘tgan` : "Muddati o‘tgan qarz yo‘q"}</span>
          </div>
        </div>
        <div className="card kpi mj-kpi">
          <span className="ic-tile warning">
            <Landmark className="ic" size={20} />
          </span>
          <div className="mj-kpi-body">
            <span className="kpi-label">Jami qarz</span>
            <span className="kpi-val">
              {formatNumber(stats.totalDebt)}
              <small>so‘m</small>
            </span>
            <span className="kpi-foot">Nasiya bo‘yicha qoldiq</span>
          </div>
        </div>
        <div className="card kpi mj-kpi">
          <span className="ic-tile info">
            <Clock className="ic" size={20} />
          </span>
          <div className="mj-kpi-body">
            <span className="kpi-label">Muddati yaqin</span>
            <span className="kpi-val">{stats.dueSoon}</span>
            <span className="kpi-foot">3 kun ichida to‘lanishi kerak</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="tabs mj-tabs" role="tablist" aria-label="Holat bo‘yicha">
          {(
            [
              ["all", "Hammasi"],
              ["debtors", "Qarzdorlar"],
              ["paid", "Qarzi yo‘q"],
              ["dueSoon", "Muddati yaqin"],
            ] as [StatusFilter, string][]
          ).map(([key, label]) => (
            <button
              type="button"
              key={key}
              role="tab"
              aria-selected={status === key}
              className={`tab${status === key ? " is-active" : ""}`}
              onClick={() => setStatus(key)}
            >
              {label}
              <span className="count count-soft">{statusCounts[key]}</span>
            </button>
          ))}
        </div>

        <div className="tbl-bar">
          <div className="control control-sm mj-search">
            <Search className="ic" size={16} />
            <input
              placeholder="Ism yoki telefon bo‘yicha qidirish…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Mijoz qidirish"
            />
          </div>
          <div className={`control control-sm mj-select rfm-select${groupFilter ? " is-set" : ""}`}>
            <select aria-label="Guruh bo‘yicha" value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
              <option value="">Barcha guruhlar</option>
              <option value="none">Guruhsiz</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <ChevronDown className="ic" size={14} />
          </div>
          {tags.length > 0 && (
            <div className={`control control-sm mj-select rfm-select${tagFilter ? " is-set" : ""}`}>
              <select aria-label="Teg bo‘yicha" value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
                <option value="">Barcha teglar</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="ic" size={14} />
            </div>
          )}
          <div className="control control-sm mj-select rfm-select">
            <select aria-label="Tartiblash" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
              {SORT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <ChevronDown className="ic" size={14} />
          </div>
          {anyFilter && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={resetFilters}>
              <X className="ic" size={14} />
              Tozalash
            </button>
          )}
        </div>

        {visible.length === 0 ? (
          <div className="empty">
            <span className="em-ic">
              <UserRound className="ic" size={28} />
            </span>
            {customers.length === 0 ? (
              <>
                <h4>Hali mijoz qo‘shilmagan</h4>
                <p>Birinchi mijozni qo‘shing yoki Kassada sotuvga mijoz biriktiring.</p>
                <div className="acts">
                  <button type="button" className="btn btn-primary" onClick={() => setFormTarget("new")}>
                    <Plus className="ic" size={18} />
                    Mijoz qo‘shish
                  </button>
                </div>
              </>
            ) : (
              <>
                <h4>Mijoz topilmadi</h4>
                <p>Tanlangan filtrlar bo‘yicha hech narsa topilmadi.</p>
                <div className="acts">
                  <button type="button" className="btn btn-outline" onClick={resetFilters}>
                    Filtrlarni tozalash
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Mijoz</th>
                  <th className="mj-col-hide-m">Guruh va teglar</th>
                  <th className="mj-col-hide-m">Manzil</th>
                  <th className="r">Buyurtmalar</th>
                  <th className="r">Jami xaridlar</th>
                  <th>Nasiya qarzi</th>
                  <th className="r mj-col-act">
                    <span className="sr">Amallar</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => {
                  const tier = tiers ? tierFor(tiers, c.totalSpent) : null;
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="prod mj-cust">
                          <span className={`av av-sm ${avClass(c.id)}`}>{initials(c.name)}</span>
                          <div>
                            <b className="rf-ellipsis">{c.name}</b>
                            <span>
                              {c.phone ? <span className="mono">{c.phone}</span> : "Telefon yo‘q"}
                              {c.fromTelegram && (
                                <>
                                  {" · "}
                                  <span className="mj-tg" title="Telegram bot orqali ro‘yxatdan o‘tgan">
                                    <Send className="ic" size={11} />
                                    Telegram
                                  </span>
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="mj-col-hide-m">
                        {c.group || c.tags.length > 0 || tier ? (
                          <div className="mj-segs">
                            {c.group && <SegmentBadge kind="group" name={c.group.name} color={c.group.color} small />}
                            {c.tags.map((t) => (
                              <SegmentBadge key={t.id} name={t.name} color={t.color} small />
                            ))}
                            {tier && (
                              <span className={`badge badge-sm badge-outline mj-tierbadge mj-c-${tier.color}`} title="Sodiqlik darajasi">
                                ★ {tier.name}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="mj-muted">—</span>
                        )}
                      </td>
                      <td className="mj-col-hide-m">
                        <div className="mj-addr" title={c.address ?? undefined}>
                          {c.address || <span className="mj-muted">—</span>}
                        </div>
                      </td>
                      <td className="r mono strong">{c.ordersCount}</td>
                      <td className="r mono strong" style={{ whiteSpace: "nowrap" }}>
                        {formatSom(c.totalSpent)}
                      </td>
                      <td>
                        {c.debt > 0 ? (
                          <span className={`badge ${c.overdue ? "badge-danger" : c.dueSoon ? "badge-warning" : "badge-danger"}`}>
                            <span className="mono">{formatSom(c.debt)}</span>
                            {c.overdue ? " · muddati o‘tgan" : c.dueSoon ? " · muddati yaqin" : ""}
                          </span>
                        ) : (
                          <span className="badge badge-success">Qarzi yo‘q</span>
                        )}
                      </td>
                      <td className="r mj-col-act">
                        <div className="mj-acts">
                          <button
                            type="button"
                            className="row-act"
                            onClick={() => setHistoryTarget(c)}
                            aria-label={`${c.name}: xaridlar tarixi`}
                            title="Xaridlar tarixi"
                          >
                            <History className="ic" size={16} />
                          </button>
                          <button
                            type="button"
                            className="row-act"
                            onClick={() => setFormTarget(c)}
                            aria-label={`${c.name}: tahrirlash`}
                            title="Tahrirlash"
                          >
                            <Pencil className="ic" size={16} />
                          </button>
                          <button
                            type="button"
                            className="row-act mj-danger"
                            onClick={() => {
                              setDeleteError("");
                              setDeleteTarget(c);
                            }}
                            aria-label={`${c.name}: o‘chirish`}
                            title="O‘chirish"
                          >
                            <Trash2 className="ic" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="tbl-foot">
          <span>
            {visible.length === customers.length
              ? `${customers.length} ta mijoz`
              : `${visible.length} / ${customers.length} ta mijoz`}
          </span>
        </div>
      </div>

      {formTarget && (
        <CustomerFormModal
          customer={formTarget === "new" ? null : formTarget}
          groups={groups}
          tags={tags}
          onClose={() => setFormTarget(null)}
          onSaved={() => router.refresh()}
        />
      )}

      {historyTarget && <CustomerHistoryModal customer={historyTarget} onClose={() => setHistoryTarget(null)} />}

      <RfModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        busy={deleting}
        width={440}
        title="Mijozni o‘chirasizmi?"
        icon={<Trash2 className="ic" size={20} />}
        iconTone="danger"
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Bekor qilish
            </button>
            <button
              type="button"
              className={`btn btn-danger${deleting ? " is-loading" : ""}`}
              onClick={confirmDelete}
              disabled={deleting}
            >
              O‘chirish
            </button>
          </>
        }
      >
        {deleteTarget && (
          <div className="mj-confirm">
            <p className="t-body-sm">
              «{deleteTarget.name}» o‘chiriladi. Sotuvlarda ishlatilgan mijozni o‘chirib bo‘lmaydi. Bu amalni ortga
              qaytarib bo‘lmaydi.
            </p>
            {deleteError && (
              <div className="alert mj-alert" role="alert">
                <p>{deleteError}</p>
              </div>
            )}
          </div>
        )}
      </RfModal>
    </>
  );
}
