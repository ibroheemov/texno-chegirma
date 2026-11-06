"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Check, X, Tag } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

export type CategoryRow = { id: string; name: string; productCount: number };

export function CategoryList({ initialCategories }: { initialCategories: CategoryRow[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");

  async function add() {
    if (!newName.trim()) return;
    setError("");
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }
    setNewName("");
    setAdding(false);
    router.refresh();
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEditingId(null);
    router.refresh();
  }

  async function remove(id: string) {
    setError("");
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }
    router.refresh();
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Kategoriyalar</h2>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus size={16} /> Qo&apos;shish
        </Button>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {adding && (
        <div className="mt-3 flex gap-2">
          <Input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Kategoriya nomi"
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <Button size="sm" onClick={add}>
            <Check size={16} />
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setAdding(false)}>
            <X size={16} />
          </Button>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {initialCategories.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-border p-3">
            {editingId === c.id ? (
              <div className="flex flex-1 gap-1.5">
                <Input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEdit(c.id)}
                />
                <Button size="sm" onClick={() => saveEdit(c.id)}>
                  <Check size={14} />
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <Tag size={14} />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted">{c.productCount} ta mahsulot</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditingId(c.id);
                      setEditName(c.name);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-muted text-foreground hover:text-accent"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => remove(c.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-muted text-foreground hover:text-danger"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      {initialCategories.length === 0 && !adding && (
        <p className="py-10 text-center text-sm text-muted">Hali kategoriya qo&apos;shilmagan</p>
      )}
    </Card>
  );
}
