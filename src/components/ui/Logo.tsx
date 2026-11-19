import { cn } from "@/lib/cn";

// The TC logo has a black "T", so it sits on a white plate to stay readable
// in dark mode too.
export function Logo({ className, imgClassName }: { className?: string; imgClassName?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-lg bg-white px-1.5 py-1", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Texno Chegirma" className={cn("w-auto", imgClassName ?? "h-6")} />
    </span>
  );
}
