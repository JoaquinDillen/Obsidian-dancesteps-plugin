import { useEffect, useRef, useState } from "react";

type TourStep = {
  id: string;           // matches a [data-tour=id] element
  title: string;
  body: string;
};

interface TourOverlayProps {
  steps: TourStep[];
  onClose: () => void;
}

/**
 * Minimal, dependency-free onboarding tour overlay.
 *
 * Locates elements via [data-tour] attributes and positions a simple tooltip
 * near them. Provides Back/Next and a Skip button. Keeps scope tight to avoid
 * heavy deps; good enough for first-run guidance.
 */
export function TourOverlay({ steps, onClose }: TourOverlayProps) {
  const [index, setIndex] = useState(0);
  const step = steps[index];

  const [target, setTarget] = useState<HTMLElement | null>(null);
  // Robustly resolve the current target element; retry until found or use root fallback
  useEffect(() => {
    if (!step) return;
    let cancelled = false;
    let tries = 0;
    const maxTries = 30; // ~3s total

    const tryFind = () => {
      if (cancelled) return;
      const el = document.querySelector(`[data-tour="${step.id}"]`) as HTMLElement | null;
      if (el) {
        setTarget(el);
        return;
      }
      // fallback to root container so the tooltip still shows somewhere sensible
      const root = document.querySelector('[data-tour-root]') as HTMLElement | null;
      if (root) setTarget(root);
      if (tries++ < maxTries) setTimeout(tryFind, 100);
    };
    tryFind();
    return () => { cancelled = true; };
  }, [step?.id]);

  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!target) return;
    // Scroll into view and compute a basic position near the element
    try { target.scrollIntoView({ block: "center", behavior: "smooth" }); } catch {}
    const update = () => {
      const rect = target.getBoundingClientRect();
      const GAP = 8;
      const GUTTER = 12;
      const tipBox = tipRef.current?.getBoundingClientRect() || { width: 320, height: 160 } as DOMRect;
      const w = Math.min(tipBox.width || 320, window.innerWidth - 2 * GUTTER);
      const h = Math.min(tipBox.height || 160, window.innerHeight - 2 * GUTTER);

      const spaceLeft = rect.left - GUTTER;
      const spaceRight = window.innerWidth - rect.right - GUTTER;
      const spaceAbove = rect.top - GUTTER;
      const spaceBelow = window.innerHeight - rect.bottom - GUTTER;

      let left = GUTTER;
      let top = GUTTER;

      // Prefer placing horizontally next to the target if possible
      if (spaceRight >= w) {
        // place to the right of target
        left = Math.min(rect.right + GAP, window.innerWidth - w - GUTTER);
        top = Math.max(GUTTER, Math.min(rect.top, window.innerHeight - h - GUTTER));
      } else if (spaceLeft >= w) {
        // place to the left of target
        left = Math.max(GUTTER, rect.left - w - GAP);
        top = Math.max(GUTTER, Math.min(rect.top, window.innerHeight - h - GUTTER));
      } else if (spaceBelow >= h) {
        // place below target
        top = Math.min(rect.bottom + GAP, window.innerHeight - h - GUTTER);
        left = Math.max(GUTTER, Math.min(rect.left, window.innerWidth - w - GUTTER));
      } else {
        // place above target as a last resort
        top = Math.max(GUTTER, rect.top - h - GAP);
        left = Math.max(GUTTER, Math.min(rect.left, window.innerWidth - w - GUTTER));
      }

      setPos({ top, left });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [target]);

  const next = () => setIndex((i) => Math.min(steps.length - 1, i + 1));
  const prev = () => setIndex((i) => Math.max(0, i - 1));

  if (!step) return null;

  return (
    <div className="dr-tour-overlay">
      {/* Backdrop */}
      <div className="dr-tour-backdrop" onClick={onClose} />

      {/* Tooltip */}
      {pos && (
        <div
          role="dialog"
          aria-modal="true"
          className="dr-tour-tip"
          style={{ top: pos.top, left: pos.left }}
          ref={tipRef}
        >
          <div className="dr-tour-title">{step.title}</div>
          <div className="dr-tour-body">{step.body}</div>
          <div className="dr-tour-actions">
            <button type="button" onClick={onClose} className="dr-tour-skip">Skip</button>
            <div className="dr-tour-nav">
              <button
                type="button"
                onClick={prev}
                disabled={index === 0}
                className="dr-tour-prev"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => (index === steps.length - 1 ? onClose() : next())}
                className="dr-tour-next"
              >
                {index === steps.length - 1 ? "Done" : "Next"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
