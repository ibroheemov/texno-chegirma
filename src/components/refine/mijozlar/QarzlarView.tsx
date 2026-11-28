"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  HandCoins,
  History,
  Landmark,
  Loader2,
  Search,
  Users,
  Wallet,
} from "lucide-react";
import { RfField, RfModal, RfSelect } from "../RfModal";
import { avClass, initials, readError } from "./shared";
import { daysBetween, formatDate, formatDateTime, formatNumber, formatSom } from "@/lib/format";
import { exportCreditLedgersToExcel } from "@/lib/exportExcel";

export type DebtLedger = {
  id: string;
  totalAmount: number;
  paidAmount: number;
  dueDate: string;
  createdAt: string;
  customer: { id: string; name: string; phone: string | null };
};

type Status = "overdue" | "upcoming" | "paid";
type TabKey = Status | "all";
type SortKey = "due-asc" | "remaining-desc" | "created-desc" | "name-asc";

const TABS: [TabKey, string][] = [
  ["overdue", "Muddati o‘tgan"],
  ["upcoming", "Muddati bor"],
  ["paid", "To‘liq to‘langan"],
  ["all", "Hammasi"],
];

const SORT_OPTIONS: [SortKey, string][] = [
  ["due-asc", "Muddat: yaqinlari oldin"],
  ["remaining-desc", "Qoldiq: ko‘pdan kamga"],
  ["created-desc", "Olingan sana: yangilari"],
  ["name-asc", "Mijoz: A → Z"],
];

function statusOf(l: DebtLedger, now: Date): Status {
  if (l.paidAmount >= l.totalAmount) return "paid";
  return new Date(l.dueDate) < now ? "overdue" : "upcoming";
}

export function QarzlarView({
  ledgers,
  employees,
  nowIso,
}: {
  ledgers: DebtLedger[];
  employees: { id: string; name: string }[];
  nowIso: string;
}) {
  const router = useRouter();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("due-asc");
  const [payTarget, setPayTarget] = useState<DebtLedger | null>(null);
  const [historyTarget, setHistoryTarget] = useState<{ id: string; name: string } | null>(null);

  const withStatus = useMemo(() => ledgers.map((l) => ({ ...l, status: statusOf(l, now) })), [ledgers, now]);
  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { overdue: 0, upcoming: 0, paid: 0, all: withStatus.length };
    for (const l of withStatus) c[l.status]++;
    return c;
  }, [withStatus]);
  const [tab, setTab] = useState<TabKey>(counts.overdue > 0 ? "overdue" : counts.upcoming > 0 ? "upcoming" : "all");

  const stats = useMemo(() => {
    let totalDebt = 0;
    let overdueDebt = 0;
    let totalPaid = 0;
    const debtors = new Set<string>();
    for (const l of withStatus) {
      const remaining = Math.max(0, l.totalAmount - l.paidAmount);
      totalDebt += remaining;
      totalPaid += l.paidAmount;
      if (l.status === "overdue") overdueDebt += remaining;
      if (remaining > 0) debtors.add(l.customer.id);
    }
    return { totalDebt, overdueDebt, totalPaid, debtors: debtors.size };
  }, [withStatus]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = withStatus.filter((l) => {
      if (tab !== "all" && l.status !== tab) return false;
      if (q && !l.customer.name.toLowerCase().includes(q) && !l.customer.phone?.toLowerCase().includes(q)) return false;
      return true;
    });
    list.sort((a, b) => {
      switch (sortKey) {
        case "remaining-desc":
          return b.totalAmount - b.paidAmount - (a.totalAmount - a.paidAmount);
        case "created-desc":
          return b.createdAt.localeCompare(a.createdAt);
        case "name-asc":
          return a.customer.name.localeCompare(b.customer.name);
        default:
          return a.dueDate.localeCompare(b.dueDate);
      }
    });
    return list;
  }, [withStatus, tab, query, sortKey]);

  return (
    <>
      <div className="page-h">
        <div className="ttl">
          <span className="t-overline" style={{ color: "var(--primary-text)" }}>
            Mijozlar
          </span>
          <h1 className="t-h1">Mijozlar qarzlari</h1>
          <p className="t-body-sm">Nasiya savdolari, to‘lov muddatlari va qarzni qabul qilish.</p>
        </div>
        <div className="acts">
          {ledgers.length > 0 && (
            <button type="button" className="btn btn-outline" onClick={() => exportCreditLedgersToExcel(visible)}>
              <FileSpreadsheet className="ic" size={18} />
              Excel
            </button>
          )}
        </div>
      </div>

      <div className="mj-kpis">
        <div className="card kpi mj-kpi">
          <span className="ic-tile warning">
            <Landmark className="ic" size={20} />
          </span>
          <div className="mj-kpi-body">
            <span className="kpi-label">Nasiyadagi summa</span>
            <span className="kpi-val">
              {formatNumber(stats.totalDebt)}
              <small>so‘m</small>
            </span>
            <span className="kpi-foot">To‘lanmagan qoldiq</span>
          </div>
        </div>
        <div className="card kpi mj-kpi">
          <span className="ic-tile success">
            <CheckCircle2 className="ic" size={20} />
          </span>
          <div className="mj-kpi-body">
            <span className="kpi-label">To‘langan</span>
            <span className="kpi-val">
              {formatNumber(stats.totalPaid)}
              <small>so‘m</small>
            </span>
            <span className="kpi-foot">Nasiya bo‘yicha qabul qilingan</span>
          </div>
        </div>
        <div className="card kpi mj-kpi">
          <span className="ic-tile danger">
            <AlertCircle className="ic" size={20} />
          </span>
          <div className="mj-kpi-body">
            <span className="kpi-label">Muddati o‘tgan</span>
            <span className="kpi-val">
              {formatNumber(stats.overdueDebt)}
              <small>so‘m</small>
            </span>
            <span className="kpi-foot">{counts.overdue} ta nasiya</span>
          </div>
        </div>
        <div className="card kpi mj-kpi">
          <span className="ic-tile">
            <Users className="ic" size={20} />
          </span>
          <div className="mj-kpi-body">
            <span className="kpi-label">Qarzdorlar</span>
            <span className="kpi-val">{stats.debtors}</span>
            <span className="kpi-foot">Qarzi bor mijozlar</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="tabs mj-tabs" role="tablist" aria-label="Holat bo‘yicha">
          {TABS.map(([key, label]) => (
            <button
              type="button"
              key={key}
              role="tab"
              aria-selected={tab === key}
              className={`tab${tab === key ? " is-active" : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
              <span className="count count-soft">{counts[key]}</span>
            </button>
          ))}
        </div>
        <div className="tbl-bar">
          <div className="control control-sm mj-search">
            <Search className="ic" size={16} />
            <input
              placeholder="Mijoz ismi yoki telefon…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Qarzdor qidirish"
            />
          </div>
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
        </div>

        {visible.length === 0 ? (
          <div className="empty">
            <span className="em-ic">
              <HandCoins className="ic" size={28} />
            </span>
            <h4>{ledgers.length === 0 ? "Nasiya yozuvlari yo‘q" : "Hech narsa topilmadi"}</h4>
            <p>
              {ledgers.length === 0
                ? "Kassada «Nasiya» bilan sotilgan savdolar shu yerda ko‘rinadi."
                : "Boshqa holat yoki qidiruvni tanlang."}
            </p>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Mijoz</th>
                  <th className="r">Qoldiq</th>
                  <th className="r mj-col-hide-m">Jami / to‘langan</th>
                  <th>Muddat</th>
                  <th>Holat</th>
                  <th className="r mj-col-act">
                    <span className="sr">Amallar</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((l) => {
                  const remaining = l.totalAmount - l.paidAmount;
                  const days = Math.abs(daysBetween(new Date(l.dueDate), now));
                  return (
                    <tr key={l.id}>
                      <td>
                        <div className="prod mj-cust">
                          <span className={`av av-sm ${avClass(l.customer.id)}`}>{initials(l.customer.name)}</span>
                          <div>
                            <b className="rf-ellipsis">{l.customer.name}</b>
                            <span className="mono">{l.customer.phone || "—"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="r mono strong" style={{ whiteSpace: "nowrap" }}>
                        {formatSom(Math.max(0, remaining))}
                      </td>
                      <td className="r mono mj-col-hide-m" style={{ whiteSpace: "nowrap" }}>
                        {formatSom(l.totalAmount)}
                        <span className="mj-due">{formatSom(l.paidAmount)} to‘langan</span>
                      </td>
                      <td>
                        <span className="mono">{formatDate(l.dueDate)}</span>
                        <span className="mj-due">Olingan: {formatDate(l.createdAt)}</span>
                      </td>
                      <td>
                        {l.status === "paid" ? (
                          <span className="badge badge-success">To‘langan</span>
                        ) : l.status === "overdue" ? (
                          <span className="badge badge-danger">
                            <i className="bd" />
                            {days} kun o‘tgan
                          </span>
                        ) : (
                          <span className="badge badge-warning">
                            <i className="bd" />
                            {days} kun qoldi
                          </span>
                        )}
                      </td>
                      <td className="r mj-col-act">
                        <div className="mj-acts">
                          <button
                            type="button"
                            className="row-act"
                            onClick={() => setHistoryTarget({ id: l.customer.id, name: l.customer.name })}
                            aria-label={`${l.customer.name}: to‘lovlar tarixi`}
                            title="To‘lovlar tarixi"
                          >
                            <History className="ic" size={16} />
                          </button>
                          {l.status !== "paid" && (
                            <button type="button" className="btn btn-primary btn-sm" onClick={() => setPayTarget(l)}>
                              To‘lash
                            </button>
                          )}
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
            {visible.length} / {ledgers.length} ta nasiya
          </span>
        </div>
      </div>

      {payTarget && (
        <PayModal
          ledger={payTarget}
          employees={employees}
          onClose={() => setPayTarget(null)}
          onPaid={() => {
            setPayTarget(null);
            router.refresh();
          }}
        />
      )}
      {historyTarget && <PaymentHistoryModal target={historyTarget} now={now} onClose={() => setHistoryTarget(null)} />}
    </>
  );
}

function PayModal({
  ledger,
  employees,
  onClose,
  onPaid,
}: {
  ledger: DebtLedger;
  employees: { id: string; name: string }[];
  onClose: () => void;
  onPaid: () => void;
}) {
  const remaining = ledger.totalAmount - ledger.paidAmount;
  const [amount, setAmount] = useState(String(remaining));
  const [employeeId, setEmployeeId] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    const value = Number(amount.replace(/\s|,/g, ""));
    if (!value || value <= 0 || value > remaining) {
      setError(`To‘lov summasi 1 dan ${formatSom(remaining)} gacha bo‘lishi kerak`);
      return;
    }
    setSaving(true);
    setError("");
    // Same endpoint as the Old design Nasiya page.
    const res = await fetch(`/api/credit/${ledger.id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: value, employeeId: employeeId || undefined, note }),
    });
    setSaving(false);
    if (!res.ok) {
      setError(await readError(res));
      return;
    }
    onPaid();
  }

  return (
    <RfModal
      open
      onClose={onClose}
      busy={saving}
      width={480}
      icon={<Wallet className="ic" size={20} />}
      iconTone="success"
      title="Qarz to‘lovi"
      description={ledger.customer.name}
      onSubmit={submit}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
            Bekor qilish
          </button>
          <button type="submit" className={`btn btn-primary${saving ? " is-loading" : ""}`} disabled={saving}>
            Tasdiqlash
          </button>
        </>
      }
    >
      <div className="mj-summary">
        <div>
          <span>Jami</span>
          <b>{formatSom(ledger.totalAmount)}</b>
        </div>
        <div>
          <span>To‘langan</span>
          <b>{formatSom(ledger.paidAmount)}</b>
        </div>
        <div>
          <span>Qoldiq</span>
          <b>{formatSom(remaining)}</b>
        </div>
      </div>
      <RfField label="To‘lov summasi (so‘m)" required error={error}>
        <span className={`control${error ? " is-error" : ""}`}>
          <input
            autoFocus
            className="mono"
            inputMode="numeric"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              if (error) setError("");
            }}
          />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAmount(String(remaining))}>
            To‘liq
          </button>
        </span>
      </RfField>
      {employees.length > 0 && (
        <RfField label="To‘lovni qabul qilgan xodim" optional>
          <RfSelect value={employeeId} onChange={setEmployeeId} ariaLabel="Xodim">
            <option value="">Tanlanmagan</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </RfSelect>
        </RfField>
      )}
      <RfField label="Izoh" optional>
        <span className="control">
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Qo‘shimcha izoh" />
        </span>
      </RfField>
    </RfModal>
  );
}

type HistoryData = {
  customer: { name: string; phone: string | null };
  ledgers: {
    id: string;
    createdAt: string;
    dueDate: string;
    totalAmount: number;
    paidAmount: number;
    remaining: number;
    overdue: boolean;
    items: { name: string; qty: number; price: number }[];
    payments: { id: string; amount: number; note: string | null; employeeName: string | null; createdAt: string }[];
  }[];
  totals: { totalDebt: number; totalPaid: number; totalRemaining: number };
};

function PaymentHistoryModal({
  target,
  now,
  onClose,
}: {
  target: { id: string; name: string };
  now: Date;
  onClose: () => void;
}) {
  const [data, setData] = useState<HistoryData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/credit/customers/${target.id}/payments`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json) => !cancelled && setData(json))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [target.id]);

  return (
    <RfModal
      open
      onClose={onClose}
      width={620}
      icon={<History className="ic" size={20} />}
      title="To‘lovlar tarixi"
      description={data?.customer.phone ? `${target.name} · ${data.customer.phone}` : target.name}
      footer={
        <button type="button" className="btn btn-outline" onClick={onClose}>
          Yopish
        </button>
      }
    >
      {failed ? (
        <div className="alert mj-alert" role="alert">
          <p>Ma’lumotni yuklab bo‘lmadi</p>
        </div>
      ) : !data ? (
        <div className="mj-center">
          <Loader2 className="ic mj-spin" size={24} />
        </div>
      ) : (
        <div className="mj-history">
          <div className="mj-summary">
            <div>
              <span>Jami qarz</span>
              <b>{formatSom(data.totals.totalDebt)}</b>
            </div>
            <div>
              <span>To‘langan</span>
              <b>{formatSom(data.totals.totalPaid)}</b>
            </div>
            <div>
              <span>Qoldiq</span>
              <b>{formatSom(data.totals.totalRemaining)}</b>
            </div>
          </div>
          {data.ledgers.map((l) => {
            const days = Math.abs(daysBetween(new Date(l.dueDate), now));
            return (
              <div key={l.id} className="mj-hcard">
                <div className="mj-hcard-h">
                  <span>
                    Olingan: <span className="mono">{formatDate(l.createdAt)}</span> · Muddat:{" "}
                    <span className="mono">{formatDate(l.dueDate)}</span>
                  </span>
                  {l.remaining <= 0 ? (
                    <span className="badge badge-success badge-sm">To‘langan</span>
                  ) : l.overdue ? (
                    <span className="badge badge-danger badge-sm">{days} kun o‘tgan</span>
                  ) : (
                    <span className="badge badge-warning badge-sm">{days} kun qoldi</span>
                  )}
                </div>
                {data.ledgers.length > 1 && (
                  <div className="mj-lines">
                    <div>
                      <span>Jami / to‘langan / qoldiq</span>
                      <span className="mono">
                        {formatSom(l.totalAmount)} / {formatSom(l.paidAmount)} / {formatSom(l.remaining)}
                      </span>
                    </div>
                  </div>
                )}
                {l.items.length > 0 && (
                  <>
                    <div className="mj-sub-h">Olingan tovarlar</div>
                    <div className="mj-lines">
                      {l.items.map((item, idx) => (
                        <div key={idx}>
                          <span>
                            {item.name} <span className="mj-muted">× {item.qty}</span>
                          </span>
                          <span className="mono">{formatSom(item.price * item.qty)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div className="mj-sub-h">To‘lovlar</div>
                {l.payments.length === 0 ? (
                  <p className="mj-hint" style={{ margin: 0 }}>
                    Hali to‘lov qilinmagan
                  </p>
                ) : (
                  l.payments.map((p) => (
                    <div key={p.id} className="mj-pay">
                      <div className="mj-pay-top">
                        <span className="mono">{formatDateTime(p.createdAt)}</span>
                        <span className="mono strong" style={{ color: "var(--success-text)" }}>
                          +{formatSom(p.amount)}
                        </span>
                      </div>
                      {(p.employeeName || p.note) && (
                        <div className="mj-pay-meta">
                          {p.employeeName && <>Qabul qildi: {p.employeeName}</>}
                          {p.employeeName && p.note && " · "}
                          {p.note && <>Izoh: {p.note}</>}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </RfModal>
  );
}
