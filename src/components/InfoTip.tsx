import { CircleQuestionMark } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

interface Props {
  label: string; // accessible name of the "?" button
  title: string;
  children: ReactNode;
  align?: "left" | "right"; // which edge of the "?" the bubble lines up with
  className?: string;
  size?: number;
}

/** A small "?" button that shows an explanation on hover, keyboard focus or tap. */
export default function InfoTip({ label, title, children, align = "left", className = "", size = 15 }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  // Tap outside (touch screens) or press Escape to close.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span
      ref={ref}
      className={`infotip ${open ? "open" : ""} ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="infotip-button"
        aria-label={label}
        aria-describedby={id}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <CircleQuestionMark size={size} aria-hidden="true" />
      </button>
      <span id={id} role="tooltip" className={`infotip-bubble align-${align}`}>
        <strong className="infotip-title">{title}</strong>
        {children}
      </span>
    </span>
  );
}
