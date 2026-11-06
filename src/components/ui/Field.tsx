import { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted">{label}</label>
      {children}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="h-10 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-accent"
    />
  );
}
