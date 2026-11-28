import { Sora } from "next/font/google";

const sora = Sora({ subsets: ["latin"], weight: "700", display: "swap" });

// "kassa" wordmark of the 1kassa logo (Sora Bold, tight tracking). The "1" lives in the mark, so the two
// read as "1kassa" side by side. Sized relative to the mark height, as in the design (120px text / 140px mark).
export function KassaWordmark({ size = 36 }: { size?: number }) {
  return (
    <span
      className={sora.className}
      style={{ fontSize: size * (120 / 140), lineHeight: 1, letterSpacing: "-0.045em", fontWeight: 700 }}
    >
      kassa
    </span>
  );
}

// 1kassa mark: the number 1 on a receipt with three dashes. Colors follow the "Navy" variant of the
// "1kassa logo" design (bright blue receipt, white 1, yellow dashes), which suits the dark sidebar.
export function KassaMark({ size = 36, mono = false, className }: { size?: number; mono?: boolean; className?: string }) {
  if (mono) {
    // One color (currentColor): the receipt is filled and the "1" and the dashes are cut out of it.
    return (
      <svg
        viewBox="0 0 80 100"
        width={(size * 4) / 5}
        height={size}
        role="img"
        aria-label="1kassa"
        focusable="false"
        className={className}
      >
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M4 4L13 11L22 4L31 11L40 4L49 11L58 4L67 11L76 4V96L67 89L58 96L49 89L40 96L31 89L22 96L13 89L4 96Z M28 27L42 19H51V64H41V32L31 37Z M19 73H27A2 2 0 0 1 29 75V76A2 2 0 0 1 27 78H19A2 2 0 0 1 17 76V75A2 2 0 0 1 19 73Z M36 73H44A2 2 0 0 1 46 75V76A2 2 0 0 1 44 78H36A2 2 0 0 1 34 76V75A2 2 0 0 1 36 73Z M53 73H61A2 2 0 0 1 63 75V76A2 2 0 0 1 61 78H53A2 2 0 0 1 51 76V75A2 2 0 0 1 53 73Z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 80 100" width={(size * 4) / 5} height={size} role="img" aria-label="1kassa" focusable="false">
      <path
        d="M4 4L13 11L22 4L31 11L40 4L49 11L58 4L67 11L76 4V96L67 89L58 96L49 89L40 96L31 89L22 96L13 89L4 96Z"
        fill="#2E6BFF"
      />
      <path d="M28 27L42 19H51V64H41V32L31 37Z" fill="#FFFFFF" />
      <g fill="#FFC83D">
        <rect x="17" y="73" width="12" height="5" rx="2" />
        <rect x="34" y="73" width="12" height="5" rx="2" />
        <rect x="51" y="73" width="12" height="5" rx="2" />
      </g>
    </svg>
  );
}
