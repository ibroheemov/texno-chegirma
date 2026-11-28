"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, ChevronDown, Gift, Info, Plus, Search, Settings2, Trash2, Trophy, UserRound } from "lucide-react";
import { RfModal } from "../RfModal";
import { avClass, initials, readError } from "./shared";
import { formatNumber, formatSom } from "@/lib/format";
import {
  SEGMENT_COLORS,
  SEGMENT_COLOR_LABELS,
  nextTier,
  tierFor,
  type LoyaltyTier,
  type SegmentColor,
} from "@/lib/customerSegments";
import type { NdCustomerRow } from "@/lib/customerRows";

const PAGE = 25;

export function SodiqlikView({
  customers,
  enabled,
  saved,
  tiers,
}: {
  customers: Pick<NdCustomerRow, "id" | "name" | "phone" | "totalSpent" | "ordersCount">[];
  enabled: boolean;
  saved: boolean;
  tiers: LoyaltyTier[];
}) {
  const router = useRouter();
  const [editorOpen, setEditorOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const ranked = useMemo(
    () =>
      customers
        .map((c) => ({ ...c, tier: tierFor(tiers, c.totalSpent), next: nextTier(tiers, c.totalSpent) }))
        .sort((a, b) => b.totalSpent - a.totalSpent),
    [customers, tiers]
  );

  const tierCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of ranked) if (c.tier) counts.set(c.tier.id, (counts.get(c.tier.id) ?? 0) + 1);
    return counts;
  }, [ranked]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ranked.filter((c) => {
      if (tierFilter === "none" ? c.tier : tierFilter && c.tier?.id !== tierFilter) return false;
      if (q && !c.name.toLowerCase().includes(q) && !c.phone?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [ranked, tierFilter, query]);

  const belowFirst = ranked.filter((c) => !c.tier).length;

  async function toggle() {
    setToggling(true);
    setToggleError("");
    const res = await fetch("/api/loyalty", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled, tiers }),
    });
    setToggling(false);
    if (!res.ok) {
      setToggleError(await readError(res));
      return;
    }
    router.refresh();
  }

  return (
    <>
      <div className="page-h">
        <div className="ttl">
          <span className="t-overline" style={{ color: "var(--primary-text)" }}>
            Mijozlar
          </span>
          <h1 className="t-h1">Sodiqlik dasturi</h1>
          <p className="t-body-sm">Mijozlar jami xaridlariga qarab darajaga ega bo‘ladi. Har bir daraja o‘z chegirmasini beradi.</p>
        </div>
        <div className="acts">
          <label className={`switch${toggling ? " is-disabled" : ""}`}>
            <input type="checkbox" checked={enabled} onChange={toggle} disabled={toggling} />
            <span className="track" />
            {enabled ? "Dastur yoqilgan" : "Dastur o‘chirilgan"}
          </label>
          <button type="button" className="btn btn-primary" onClick={() => setEditorOpen(true)}>
            <Settings2 className="ic" size={18} />
            Darajalarni sozlash
          </button>
        </div>
      </div>

      {toggleError && (
        <div className="alert mj-alert" role="alert">
          <p>{toggleError}</p>
        </div>
      )}

      <div className="alert alert-info">
        <Info className="ic a-ic" size={18} />
        <div>
          <b>Chegirma Kassada hozircha avtomatik qo‘llanmaydi.</b>{" "}
          {enabled
            ? "Daraja «Barcha mijozlar» ro‘yxatida ★ belgisi bilan ko‘rinadi; kassir chegirmani qo‘lda beradi."
            : saved
              ? "Dastur o‘chirilgan: darajalar «Barcha mijozlar» ro‘yxatida ko‘rinmaydi."
              : "Bu standart darajalar. Ularni sozlang va dasturni yoqing."}{" "}
          Bekor qilingan sotuvlar hisobga olinmaydi.
        </div>
      </div>

      <div className="mj-tiers">
        {tiers.map((tier) => {
          const count = tierCounts.get(tier.id) ?? 0;
          const share = ranked.length ? Math.round((count / ranked.length) * 100) : 0;
          return (
            <button
              type="button"
              key={tier.id}
              className={`card mj-tier mj-c-${tier.color}`}
              style={{ textAlign: "left", cursor: "pointer", border: tierFilter === tier.id ? "1px solid var(--primary)" : undefined }}
              onClick={() => setTierFilter((current) => (current === tier.id ? "" : tier.id))}
              aria-pressed={tierFilter === tier.id}
              title="Shu darajadagi mijozlarni ko‘rsatish"
            >
              <div className="mj-tier-top">
                <span className="mj-grp-mark">
                  <Award className="ic" size={20} />
                </span>
                <div>
                  <b>{tier.name}</b>
                  <small>{tier.minSpent > 0 ? `${formatSom(tier.minSpent)} dan` : "Barcha xaridorlar"}</small>
                </div>
              </div>
              <div className="mj-tier-stats">
                <div>
                  <span className="kpi-label">Mijozlar</span>
                  <div className="kpi-val">{count}</div>
                </div>
                <span className="badge mj-seg">{tier.discountPercent}% chegirma</span>
              </div>
              <div className="prog prog-sm" aria-label={`${share}%`}>
                <i style={{ width: `${share}%` }} />
              </div>
            </button>
          );
        })}
      </div>

      <div className="card">
        <div className="mj-card-h">
          <span className="ic-tile sm">
            <Trophy className="ic" size={16} />
          </span>
          <div className="grow">
            <h3>Mijozlar reytingi</h3>
            <p>
              Jami xaridlar bo‘yicha.
              {belowFirst > 0 && ` ${belowFirst} ta mijoz hali birinchi darajaga yetmagan.`}
            </p>
          </div>
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
          <div className={`control control-sm mj-select rfm-select${tierFilter ? " is-set" : ""}`}>
            <select aria-label="Daraja bo‘yicha" value={tierFilter} onChange={(event) => setTierFilter(event.target.value)}>
              <option value="">Barcha darajalar</option>
              {tiers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
              {belowFirst > 0 && <option value="none">Darajasiz</option>}
            </select>
            <ChevronDown className="ic" size={14} />
          </div>
        </div>
        {visible.length === 0 ? (
          <div className="empty">
            <span className="em-ic">
              <UserRound className="ic" size={28} />
            </span>
            <h4>Mijoz topilmadi</h4>
            <p>{customers.length === 0 ? "Hali mijozlar yo‘q." : "Tanlangan filtr bo‘yicha mijoz yo‘q."}</p>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="r" style={{ width: 56 }}>
                    #
                  </th>
                  <th>Mijoz</th>
                  <th>Daraja</th>
                  <th className="r">Buyurtmalar</th>
                  <th className="r">Jami xaridlar</th>
                  <th className="mj-col-hide-m">Keyingi daraja</th>
                </tr>
              </thead>
              <tbody>
                {visible.slice(0, limit).map((c) => {
                  const rank = ranked.indexOf(c) + 1;
                  const base = c.tier?.minSpent ?? 0;
                  const progress = c.next ? Math.min(100, ((c.totalSpent - base) / (c.next.minSpent - base)) * 100) : 100;
                  return (
                    <tr key={c.id}>
                      <td className="r mono">{rank}</td>
                      <td>
                        <div className="prod mj-cust">
                          <span className={`av av-sm ${avClass(c.id)}`}>{initials(c.name)}</span>
                          <div>
                            <b className="rf-ellipsis">{c.name}</b>
                            <span className="mono">{c.phone || "—"}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        {c.tier ? (
                          <span className={`badge mj-seg mj-c-${c.tier.color}`}>
                            <Award className="ic" size={12} />
                            {c.tier.name} · {c.tier.discountPercent}%
                          </span>
                        ) : (
                          <span className="badge badge-outline">Darajasiz</span>
                        )}
                      </td>
                      <td className="r mono strong">{c.ordersCount}</td>
                      <td className="r mono strong" style={{ whiteSpace: "nowrap" }}>
                        {formatSom(c.totalSpent)}
                      </td>
                      <td className="mj-col-hide-m">
                        {c.next ? (
                          <div className={`mj-progress-cell mj-c-${c.next.color}`}>
                            <div className="prog prog-sm">
                              <i style={{ width: `${progress}%` }} />
                            </div>
                            <small>
                              {c.next.name}gacha <span className="mono">{formatNumber(c.next.minSpent - c.totalSpent)}</span> so‘m
                            </small>
                          </div>
                        ) : (
                          <span className="badge badge-success">Eng yuqori daraja</span>
                        )}
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
            {Math.min(limit, visible.length)} / {visible.length} ta mijoz
          </span>
          {visible.length > limit && (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setLimit((n) => n + PAGE)}>
              Yana ko‘rsatish
            </button>
          )}
        </div>
      </div>

      {editorOpen && (
        <TierEditorModal
          tiers={tiers}
          enabled={enabled}
          saved={saved}
          onClose={() => setEditorOpen(false)}
          onSaved={() => {
            setEditorOpen(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

type DraftTier = { id: string; name: string; minSpent: string; discountPercent: string; color: SegmentColor };

function TierEditorModal({
  tiers,
  enabled,
  saved,
  onClose,
  onSaved,
}: {
  tiers: LoyaltyTier[];
  enabled: boolean;
  saved: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<DraftTier[]>(
    tiers.map((t) => ({ ...t, minSpent: String(t.minSpent), discountPercent: String(t.discountPercent) }))
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update(index: number, patch: Partial<DraftTier>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    if (error) setError("");
  }

  async function save() {
    if (rows.some((r) => !r.name.trim())) {
      setError("Har bir darajaga nom bering");
      return;
    }
    const mins = rows.map((r) => Number(r.minSpent.replace(/\s|,/g, "")));
    if (mins.some((m) => !Number.isFinite(m) || m < 0)) {
      setError("Xarid chegarasi musbat son bo‘lishi kerak");
      return;
    }
    if (new Set(mins).size !== mins.length) {
      setError("Ikki darajaning xarid chegarasi bir xil bo‘lmasin");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/loyalty", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Saving the first time switches the program on.
        enabled: saved ? enabled : true,
        tiers: rows.map((r, i) => ({
          id: r.id,
          name: r.name.trim(),
          minSpent: mins[i],
          discountPercent: Number(r.discountPercent.replace(",", ".")) || 0,
          color: r.color,
        })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError(await readError(res));
      return;
    }
    onSaved();
  }

  return (
    <RfModal
      open
      onClose={onClose}
      busy={saving}
      width={760}
      icon={<Gift className="ic" size={20} />}
      title="Darajalarni sozlash"
      description="Mijoz jami xaridi chegaradan oshsa, shu darajaga o‘tadi."
      onSubmit={save}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>
            Bekor qilish
          </button>
          <button type="submit" className={`btn btn-primary${saving ? " is-loading" : ""}`} disabled={saving}>
            {saved ? "Saqlash" : "Saqlash va yoqish"}
          </button>
        </>
      }
    >
      <div className="mj-tier-editor">
        <div className="mj-tier-row mj-col-hide-m">
          <span />
          <span className="mj-tier-colhead">Nomi</span>
          <span className="mj-tier-colhead">Xarid chegarasi (so‘m)</span>
          <span className="mj-tier-colhead">Chegirma %</span>
          <span className="mj-tier-colhead">Rang</span>
          <span />
        </div>
        {rows.map((row, index) => (
          <div className="mj-tier-row" key={row.id}>
            <span className={`mj-swatch mj-c-${row.color}`} aria-hidden="true" />
            <span className="control control-sm">
              <input value={row.name} maxLength={40} onChange={(e) => update(index, { name: e.target.value })} aria-label="Daraja nomi" />
            </span>
            <span className="control control-sm">
              <input
                className="mono"
                inputMode="numeric"
                value={row.minSpent}
                onChange={(e) => update(index, { minSpent: e.target.value })}
                aria-label="Xarid chegarasi"
              />
            </span>
            <span className="control control-sm">
              <input
                className="mono"
                inputMode="decimal"
                value={row.discountPercent}
                onChange={(e) => update(index, { discountPercent: e.target.value })}
                aria-label="Chegirma foizi"
              />
            </span>
            <span className="control control-sm rfm-select" style={{ width: 130 }}>
              <select value={row.color} onChange={(e) => update(index, { color: e.target.value as SegmentColor })} aria-label="Rang">
                {SEGMENT_COLORS.map((c) => (
                  <option key={c} value={c}>
                    {SEGMENT_COLOR_LABELS[c]}
                  </option>
                ))}
              </select>
              <ChevronDown className="ic" size={14} />
            </span>
            <button
              type="button"
              className="row-act mj-danger"
              disabled={rows.length <= 1}
              onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
              aria-label={`${row.name || "Daraja"}ni o‘chirish`}
              title="O‘chirish"
            >
              <Trash2 className="ic" size={16} />
            </button>
          </div>
        ))}
        {rows.length < 10 && (
          <div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() =>
                setRows((current) => [
                  ...current,
                  {
                    id: `t-${Date.now().toString(36)}`,
                    name: "",
                    minSpent: String((Math.max(0, ...current.map((r) => Number(r.minSpent) || 0)) || 0) + 10_000_000),
                    discountPercent: "0",
                    color: SEGMENT_COLORS[current.length % SEGMENT_COLORS.length],
                  },
                ])
              }
            >
              <Plus className="ic" size={16} />
              Daraja qo‘shish
            </button>
          </div>
        )}
        {error && (
          <div className="alert mj-alert" role="alert">
            <p>{error}</p>
          </div>
        )}
      </div>
    </RfModal>
  );
}
