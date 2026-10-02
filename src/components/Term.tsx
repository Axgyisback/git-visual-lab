import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface Props {
  title: string;
  tip: ReactNode;
  className?: string;
  children: ReactNode;
}

const WIDTH = 270;

/**
 * Wraps a label (e.g. a "HEAD" chip) and explains it on hover or keyboard focus.
 * The bubble is rendered in <body> with fixed positioning, so it is never clipped
 * by the scrolling commit list or the rounded panels around it.
 */
export default function Term({ title, tip, className = "", children }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const left = Math.min(Math.max(r.left + r.width / 2 - WIDTH / 2, 12), window.innerWidth - WIDTH - 12);
    // open below the label, or above it when there is no room underneath
    if (r.bottom + 170 > window.innerHeight) setPos({ left, bottom: window.innerHeight - r.top + 8 });
    else setPos({ left, top: r.bottom + 8 });
  };
  const hide = () => setPos(null);

  useEffect(() => {
    if (!pos) return;
    // keep the bubble attached to its label while the page scrolls or resizes
    window.addEventListener("scroll", show, true);
    window.addEventListener("resize", show);
    return () => {
      window.removeEventListener("scroll", show, true);
      window.removeEventListener("resize", show);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos !== null]);

  return (
    <span
      ref={ref}
      className={`term ${className}`}
      tabIndex={0}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {pos &&
        createPortal(
          <span role="tooltip" className="term-bubble" style={pos}>
            <strong>{title}</strong>
            {tip}
          </span>,
          document.body,
        )}
    </span>
  );
}
