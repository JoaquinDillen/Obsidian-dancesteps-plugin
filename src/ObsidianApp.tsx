import { useMemo } from "react";
import { Dashboard } from "./external-app/components/Dashboard";
import type { StepItem as AppStep } from "./external-app/types/dance";
import type { DanceStepItem } from "./types";
import { LibraryModal } from "./ui/libraryModal";

type Props = {
  items: DanceStepItem[];
  toUrl: (vaultPath: string) => string; // e.g., this.app.vault.adapter.getResourcePath(...)
  actions?: {
    openPath: (p: string) => Promise<void>;
    revealPath: (p: string) => Promise<void>;
    copyPath: (p: string) => Promise<void>;
    saveMeta?: (videoPath: string, meta: Partial<{ stepName: string; description: string; dance: string; style: string; class: string }>) => Promise<void>;
  };
};

export default function ObsidianApp({ items, toUrl, actions }: Props) {
  // Map vault items -> your app's StepItem shape, converting to vault URLs
  const steps: AppStep[] = useMemo(() => {
    return items.map((it) => ({
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
  }, [items, toUrl]);

  const handleAddStep = () => {
    // Open the library modal and let the user pick an item
    // Use the global Obsidian app instance available in the renderer
    const app = (window as any)?.app;
    if (!app) {
      console.warn("Obsidian app not found on window");
      return;
    }
    const modal = new LibraryModal(app, items, (index) => {
      const picked = items[index];
      // If host actions are available, open the picked file in Obsidian
      if (actions?.openPath) {
        actions.openPath(picked.path);
      }
    });
    modal.open();
  };

  return (
    <Dashboard
      steps={steps}
      onStepSelect={(step) => {
        // Placeholder for viewer routing
        console.log("Selected:", step.id);
      }}
      onAddStep={handleAddStep}
      onEditStep={async (step) => {
        // no-op here; Dashboard handles local state
      }}
      onDeleteStep={() => {}}
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
    />
  );
}
