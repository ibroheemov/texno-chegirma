import { Card } from "@/components/ui/Card";
import { formatSom, formatUsd } from "@/lib/format";
import type { UsdRateInfo } from "@/lib/usdRate";
import { Wallet, TrendingUp } from "lucide-react";

export function InventorySummaryCards({
  totalCostValue,
  totalSaleValue,
  usdRateInfo,
}: {
  totalCostValue: number;
  totalSaleValue: number;
  usdRateInfo?: UsdRateInfo | null;
}) {
  const usdSub = usdRateInfo
    ? usdRateInfo.source === "cbu"
      ? ` · CBU kursi: 1$=${usdRateInfo.rate.toLocaleString("en-US")} so'm (${usdRateInfo.date})`
      : " · qo'lda kiritilgan kurs"
    : "";

  const items = [
    {
      label: "Jami tan narx",
      value: formatSom(totalCostValue),
      valueSuffix: usdRateInfo ? ` (${formatUsd(totalCostValue, usdRateInfo.rate)})` : "",
      sub: `Barcha mahsulotlar bo'yicha${usdSub}`,
      icon: Wallet,
    },
    {
      label: "Sotuv qiymati",
      value: formatSom(totalSaleValue),
      valueSuffix: "",
      sub: "Qoldiq × sotuv narxi; tushum emas",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <Card key={item.label} className="p-4">
          <div className="flex items-start justify-between">
            <span className="text-sm font-semibold text-muted">{item.label}</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-accent">
              <item.icon size={16} />
            </span>
          </div>
          <div className="mt-2 text-xl font-bold leading-tight text-foreground">
            {item.value}
            {item.valueSuffix && <span className="text-sm font-semibold text-muted">{item.valueSuffix}</span>}
          </div>
          <p className="mt-1 text-xs text-muted">{item.sub}</p>
        </Card>
      ))}
    </div>
  );
}
