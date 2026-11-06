"use client";

import type { Category } from "@prisma/client";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export type InventoryFilters = {
  categoryId: string;
  minPrice: string;
  maxPrice: string;
  minStock: string;
  maxStock: string;
};

export const emptyInventoryFilters: InventoryFilters = {
  categoryId: "",
  minPrice: "",
  maxPrice: "",
  minStock: "",
  maxStock: "",
};

export function InventoryFilterModal({
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
  function set<K extends keyof InventoryFilters>(key: K, v: InventoryFilters[K]) {
    onApply({ ...value, [key]: v });
  }

  return (
    <Modal open={open} onClose={onClose} title="Filtr">
      <div className="flex flex-col gap-3">
        <Field label="Kategoriya">
          <Select value={value.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
            <option value="">Barchasi</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Narx (dan)">
            <Input
              type="number"
              value={value.minPrice}
              onChange={(e) => set("minPrice", e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Narx (gacha)">
            <Input
              type="number"
              value={value.maxPrice}
              onChange={(e) => set("maxPrice", e.target.value)}
              placeholder="∞"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Qoldiq (dan)">
            <Input
              type="number"
              value={value.minStock}
              onChange={(e) => set("minStock", e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Qoldiq (gacha)">
            <Input
              type="number"
              value={value.maxStock}
              onChange={(e) => set("maxStock", e.target.value)}
              placeholder="∞"
            />
          </Field>
        </div>
        <div className="mt-1 flex gap-2">
          <Button onClick={() => onApply(emptyInventoryFilters)} className="flex-1" variant="secondary">
            Tozalash
          </Button>
          <Button onClick={onClose} className="flex-1">
            Qo&apos;llash
          </Button>
        </div>
      </div>
    </Modal>
  );
}
