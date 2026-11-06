"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Store, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Xatolik yuz berdi");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <Store size={24} />
          </span>
          <h1 className="text-xl font-bold">Savdo Panel</h1>
          <p className="text-sm text-muted">Kabinetga kirish uchun login va parolingizni kiriting</p>
        </div>
        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-[var(--shadow-card)]"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Login</label>
            <input
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
              placeholder="texnochegirma"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Parol</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" size="lg" disabled={loading} className="mt-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            Kirish
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted">
          Demo: login <b>demo</b> · parol <b>demo1234</b>
        </p>
      </div>
    </div>
  );
}
