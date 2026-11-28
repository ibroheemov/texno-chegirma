"use client";

import { useEffect, useId, useRef, type FormEvent, type ReactNode } from "react";
import { ChevronDown, X } from "lucide-react";
import "./rf-modal.css";

// Escape closes only the top-most open modal (product form -> "Yangi kategoriya" etc.).
const openStack: string[] = [];

/**
 * Refine Design System modal: overlay + .modal with header (icon tile, title, description),
 * scrollable body and footer. `nested` puts it above another RfModal.
 * Old design camera/scanner overlays (z-50) still open above both levels.
 */
export function RfModal({
  open,
  onClose,
  title,
  description,
  icon,
  iconTone,
  width = 520,
  nested = false,
  busy = false,
  footer,
  onSubmit,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  iconTone?: "success" | "warning" | "danger" | "info";
  width?: number;
  nested?: boolean;
  /** While true, clicking the overlay or pressing Escape does not close the modal. */
  busy?: boolean;
  footer?: ReactNode;
  /** Renders the modal as a <form>, so Enter in a field submits it. */
  onSubmit?: () => void;
  children: ReactNode;
}) {
  const id = useId();
  const titleId = `${id}-title`;
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  useEffect(() => {
    closeRef.current = onClose;
    busyRef.current = busy;
  });

  useEffect(() => {
    if (!open) return;
    openStack.push(id);
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || openStack[openStack.length - 1] !== id) return;
      event.stopPropagation();
      if (!busyRef.current) closeRef.current();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const index = openStack.lastIndexOf(id);
      if (index >= 0) openStack.splice(index, 1);
    };
  }, [open, id]);

  if (!open) return null;

  const content = (
    <>
      <div className="modal-h">
        {icon && <span className={`ic-tile${iconTone ? ` ${iconTone}` : ""}`}>{icon}</span>}
        <div className="rfm-h-text">
          <h3 id={titleId}>{title}</h3>
          {description && <p>{description}</p>}
        </div>
        <button type="button" className="x-btn" onClick={onClose} disabled={busy} aria-label="Yopish">
          <X className="ic" size={18} />
        </button>
      </div>
      <div className="modal-b">{children}</div>
      {footer && <div className="modal-f">{footer}</div>}
    </>
  );

  const shared = {
    className: "modal rfm-modal",
    role: "dialog",
    "aria-modal": true,
    "aria-labelledby": titleId,
    style: { maxWidth: width },
    onClick: (event: React.MouseEvent) => event.stopPropagation(),
  } as const;

  return (
    <div className={`rfm-overlay${nested ? " is-nested" : ""}`} onClick={() => !busy && onClose()}>
      {onSubmit ? (
        <form
          {...shared}
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {content}
        </form>
      ) : (
        <div {...shared}>{content}</div>
      )}
    </div>
  );
}

/** .field wrapper. Use `group` when the field holds buttons (a <label> would forward clicks to them). */
export function RfField({
  label,
  required,
  optional,
  help,
  error,
  group,
  children,
}: {
  label: ReactNode;
  required?: boolean;
  optional?: boolean;
  help?: ReactNode;
  error?: ReactNode;
  group?: boolean;
  children: ReactNode;
}) {
  const inner = (
    <>
      <span className="label">
        {label}
        {required && <span className="req">*</span>}
        {optional && <span className="opt">(ixtiyoriy)</span>}
      </span>
      {children}
      {error ? (
        <span className="help is-error" role="alert">
          {error}
        </span>
      ) : (
        help && <span className="help">{help}</span>
      )}
    </>
  );
  return group ? (
    <div className="field" role="group">
      {inner}
    </div>
  ) : (
    <label className="field">{inner}</label>
  );
}

/** Native <select> styled as a Refine .control with a chevron. */
export function RfSelect({
  value,
  onChange,
  children,
  size,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  size?: "sm";
  ariaLabel?: string;
}) {
  return (
    <span className={`control rfm-select${size === "sm" ? " control-sm" : ""}`}>
      <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={ariaLabel}>
        {children}
      </select>
      <ChevronDown className="ic" size={16} />
    </span>
  );
}

/** Full-width segmented control (So'm / Dollar, Naqd / Karta / Nasiya). */
export function RfSegment<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: [T, string][];
  ariaLabel?: string;
}) {
  return (
    <div className="seg rfm-seg" role="radiogroup" aria-label={ariaLabel}>
      {options.map(([key, label]) => (
        <button
          type="button"
          key={key}
          role="radio"
          aria-checked={value === key}
          className={value === key ? "is-active" : ""}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
