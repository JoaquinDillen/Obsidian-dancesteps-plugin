import { useEffect, useMemo, useRef, useState } from "react";
import { Dashboard } from "./external-app/components/Dashboard";
import type { StepItem as AppStep } from "./external-app/types/dance";
import type { DanceStepItem } from "./types";
import { LibraryModal } from "./ui/libraryModal";
import { TourOverlay } from "./external-app/components/TourOverlay";

type Props = {
  items: DanceStepItem[];
  toUrl: (vaultPath: string) => string; // e.g., this.app.vault.adapter.getResourcePath(...)
  actions?: {
    openPath: (p: string) => Promise<void>;
    revealPath: (p: string) => Promise<void>;
    copyPath: (p: string) => Promise<void>;
    saveMeta?: (videoPath: string, meta: Partial<{ stepName: string; description: string; dance: string; style: string; class: string }>) => Promise<void>;
    importVideo?: (file: File) => Promise<DanceStepItem>;
    deletePath?: (p: string) => Promise<void>;
  };
  onboardingNeeded?: boolean;
  onOnboardingComplete?: () => Promise<void> | void;
};

export default function ObsidianApp({ items, toUrl, actions, onboardingNeeded, onOnboardingComplete }: Props) {
  // Local state for steps so we can append newly imported videos without a full rescan
  const [allSteps, setAllSteps] = useState<AppStep[]>([]);
  const [externalEdit, setExternalEdit] = useState<{ step: AppStep; token: number } | null>(null);
  const tokenRef = useRef(0);
  const [showTour, setShowTour] = useState<boolean>(!!onboardingNeeded);

  // Initialize/refresh from props
  useEffect(() => {
    const mapped = items.map((it) => ({
      id: it.path,
      videoImport: toUrl(it.path),
      stepName: it.name || it.basename,
      description: it.description,
      class: it.classLevel,
      dance: it.dance,
      style: it.style,
      thumbnail: it.thumbPath ? toUrl(it.thumbPath) : undefined,
      duration: undefined,
      addedAt: Date.now(),
      playCount: 0,
      lastPlayedAt: undefined,
    }));
    setAllSteps(mapped);
  }, [items, toUrl]);

  const handleAddStep = () => {
    // Open a file picker to import a local video, then open editor
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".mp4,.avi,video/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const newItem = await (actions as any)?.importVideo?.(file);
        if (!newItem) return;
        const mapped: AppStep = {
          id: newItem.path,
          videoImport: toUrl(newItem.path),
          stepName: newItem.name || newItem.basename,
          description: newItem.description,
          class: newItem.classLevel,
          dance: newItem.dance,
          style: newItem.style,
          thumbnail: newItem.thumbPath ? toUrl(newItem.thumbPath) : undefined,
          duration: undefined,
          addedAt: Date.now(),
          playCount: 0,
          lastPlayedAt: undefined,
        };
        setAllSteps((prev) => {
          // avoid duplicates by path
          if (prev.some((s) => s.id === mapped.id)) return prev;
          return [...prev, mapped];
        });
        tokenRef.current += 1;
        setExternalEdit({ step: mapped, token: tokenRef.current });
      } catch (e) {
        console.error("Import failed", e);
      }
    };
    input.click();
  };

  return (
    <>
      <Dashboard
        steps={allSteps}
        onStepSelect={(step) => {
          // Placeholder for viewer routing
          console.log("Selected:", step.id);
        }}
        onAddStep={handleAddStep}
        onEditStep={async (step) => {
          // no-op here; Dashboard handles local state
        }}
        onDeleteStep={async (id) => { await actions?.deletePath?.(id); }}
        onSaveEdit={async (originalId, updated) => {
          // Persist via sidecar metadata
          await actions?.saveMeta?.(originalId, {
            stepName: updated.stepName,
            description: updated.description,
            dance: updated.dance,
            style: updated.style,
            class: updated.class,
          });
        }}
        externalEdit={externalEdit}
      />
      {showTour && (
        <TourOverlay
          steps={[
            { id: 'header', title: 'Dance Library', body: 'This is your library overview. Use the Add Step button to import a new video into your vault.' },
            { id: 'search', title: 'Search', body: 'Quickly find steps by name or description.' },
            { id: 'filters', title: 'Filters & Sort', body: 'Filter by class, dance, and style; adjust sort order.' },
            { id: 'grid', title: 'Steps Grid', body: 'Tap a card to select, use ••• for edit or delete, or the play icon for fullscreen.' },
          ]}
          onClose={async () => {
            setShowTour(false);
            await onOnboardingComplete?.();
          }}
        />
      )}
    </>
  );
}
