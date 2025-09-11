import { useEffect, useMemo, useState } from "react";

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

  const target = useMemo(() => {
    if (!step) return null;
    return (document.querySelector(`[data-tour="${step.id}"]`) as HTMLElement | null) ?? null;
  }, [step?.id]);

  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!target) return;
    // Scroll into view and compute a basic position below the element
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    const update = () => {
      const rect = target.getBoundingClientRect();
      const gap = 8;
      const left = Math.max(12, Math.min(window.innerWidth - 320 - 12, rect.left));
      const top = Math.min(window.innerHeight - 140, rect.bottom + gap);
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
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, pointerEvents: "none" }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", pointerEvents: "auto" }}
      />

      {/* Tooltip */}
      {pos && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "absolute",
            top: pos.top,
            left: pos.left,
            width: 320,
            background: "var(--background-primary, #1e1e1e)",
            color: "var(--text-normal, #fff)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            padding: 12,
            pointerEvents: "auto",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{step.title}</div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>{step.body}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "space-between" }}>
            <button
              type="button"
              onClick={onClose}
              style={{ background: "transparent", color: "var(--text-muted, #bbb)", border: 0, padding: "6px 8px", cursor: "pointer" }}
            >
              Skip
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={prev}
                disabled={index === 0}
                style={{
                  background: "transparent",
                  color: index === 0 ? "#666" : "var(--text-normal, #fff)",
                  border: "1px solid var(--background-modifier-border, #444)",
                  borderRadius: 6,
                  padding: "6px 10px",
                  cursor: index === 0 ? "default" : "pointer",
                }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => (index === steps.length - 1 ? onClose() : next())}
                style={{
                  background: "var(--interactive-accent, #6b9)",
                  color: "#000",
                  border: 0,
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
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

