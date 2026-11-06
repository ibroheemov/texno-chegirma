import { Card } from "@/components/ui/Card";
import { formatSom } from "@/lib/format";
import { Wallet, TrendingUp, HandCoins, ReceiptText } from "lucide-react";

export function InventorySummaryCards({
  totalCostValue,
  totalSaleValue,
  creditGoodsCost,
  outstandingDebt,
}: {
  totalCostValue: number;
  totalSaleValue: number;
  creditGoodsCost: number;
  outstandingDebt: number;
}) {
  const items = [
    {
      label: "Jami tan narx",
      value: formatSom(totalCostValue),
      sub: "Barcha mahsulotlar bo'yicha",
      icon: Wallet,
    },
    {
      label: "Sotuv qiymati",
      value: formatSom(totalSaleValue),
      sub: "Qoldiq × sotuv narxi; tushum emas",
      icon: TrendingUp,
    },
    {
      label: "Nasiya tovar",
      value: formatSom(creditGoodsCost),
      sub: "Tan narx bo'yicha",
      icon: HandCoins,
    },
    {
      label: "Qolgan qarz",
      value: formatSom(outstandingDebt),
      sub: "Mijozlarning nasiya qarzi",
      icon: ReceiptText,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="p-4">
          <div className="flex items-start justify-between">
            <span className="text-sm font-semibold text-muted">{item.label}</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-accent">
              <item.icon size={16} />
            </span>
          </div>
          <div className="mt-2 text-xl font-bold leading-tight text-foreground">{item.value}</div>
          <p className="mt-1 text-xs text-muted">{item.sub}</p>
        </Card>
      ))}
    </div>
  );
}
