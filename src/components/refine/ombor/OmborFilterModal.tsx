"use client";

import type { Category } from "@prisma/client";
import { SlidersHorizontal } from "lucide-react";
import { emptyInventoryFilters, type InventoryFilters } from "@/components/inventory/InventoryFilterModal";
import { RfField, RfModal, RfSelect } from "../RfModal";

// New design version of the Old InventoryFilterModal: filters apply as you type, like the Old one.
export function OmborFilterModal({
  open,
  onClose,
  categories,
  value,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  value: InventoryFilters;
  onApply: (next: InventoryFilters) => void;
}) {
  function set<K extends keyof InventoryFilters>(key: K, next: InventoryFilters[K]) {
    onApply({ ...value, [key]: next });
  }

  function numberInput(key: keyof InventoryFilters, placeholder: string) {
    return (
      <span className="control">
        <input
          type="number"
          inputMode="numeric"
          value={value[key]}
          onChange={(event) => set(key, event.target.value)}
          placeholder={placeholder}
        />
      </span>
    );
  }

  return (
    <RfModal
      open={open}
      onClose={onClose}
      title="Filtr"
      description="Kategoriya, narx va qoldiq bo‘yicha saralang."
      icon={<SlidersHorizontal className="ic" size={20} />}
      width={480}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={() => onApply(emptyInventoryFilters)}>
            Tozalash
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Qo‘llash
          </button>
        </>
      }
    >
      <RfField label="Kategoriya">
        <RfSelect value={value.categoryId} onChange={(next) => set("categoryId", next)}>
          <option value="">Barchasi</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </RfSelect>
      </RfField>
      <div className="rfm-grid-2">
        <RfField label="Narx (dan)">{numberInput("minPrice", "0")}</RfField>
        <RfField label="Narx (gacha)">{numberInput("maxPrice", "∞")}</RfField>
      </div>
      <div className="rfm-grid-2">
        <RfField label="Qoldiq (dan)">{numberInput("minStock", "0")}</RfField>
        <RfField label="Qoldiq (gacha)">{numberInput("maxStock", "∞")}</RfField>
      </div>
    </RfModal>
  );
}
