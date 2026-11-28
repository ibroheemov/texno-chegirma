"use client";

import { useEffect, useState } from "react";
import { History, Loader2, ShoppingBag } from "lucide-react";
import { RfModal } from "../RfModal";
import { formatDateTime, formatSom } from "@/lib/format";
import { resolveMethodLabel } from "@/lib/receipt";

type SaleRow = {
  id: string;
  createdAt: string;
  paymentMethod: string;
  customAmounts: Record<string, number> | null;
  total: number;
  canceled: boolean;
  items: { name: string; qty: number; price: number }[];
};

type ResponseData = { sales: SaleRow[]; totals: { ordersCount: number; totalSpent: number } };

/** Purchase history of one customer (same API as the Old design modal). */
export function CustomerHistoryModal({ customer, onClose }: { customer: { id: string; name: string }; onClose: () => void }) {
  const [data, setData] = useState<ResponseData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/customers/${customer.id}/sales`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json) => !cancelled && setData(json))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [customer.id]);

  return (
    <RfModal
      open
      onClose={onClose}
      width={600}
      icon={<History className="ic" size={20} />}
      title="Xaridlar tarixi"
      description={customer.name}
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
              <span>Buyurtmalar</span>
              <b>{data.totals.ordersCount}</b>
            </div>
            <div>
              <span>Jami xaridlar</span>
              <b>{formatSom(data.totals.totalSpent)}</b>
            </div>
          </div>
          {data.sales.length === 0 ? (
            <div className="empty">
              <span className="em-ic">
                <ShoppingBag className="ic" size={28} />
              </span>
              <h4>Hali xarid yo‘q</h4>
              <p>Bu mijoz hali xarid qilmagan.</p>
            </div>
          ) : (
            data.sales.map((s) => (
              <div key={s.id} className="mj-hcard">
                <div className="mj-hcard-h">
                  <span>
                    <span className="mono">{formatDateTime(new Date(s.createdAt))}</span> ·{" "}
                    {resolveMethodLabel(s.paymentMethod, s.customAmounts)}
                    {s.canceled && (
                      <>
                        {" "}
                        <span className="badge badge-danger badge-sm">Bekor qilingan</span>
                      </>
                    )}
                  </span>
                  <span className={`mono strong${s.canceled ? " is-canceled" : ""}`}>{formatSom(s.total)}</span>
                </div>
                <div className="mj-lines">
                  {s.items.map((item, idx) => (
                    <div key={idx}>
                      <span>
                        {item.name} <span className="mj-muted">× {item.qty}</span>
                      </span>
                      <span className="mono">{formatSom(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </RfModal>
  );
}
