import { ItemView, WorkspaceLeaf, Notice, TFile } from "obsidian";
import { createRoot, type Root } from "react-dom/client";
import type DanceRepoPlugin from "../main";
import { scanDanceSteps, upsertSidecarMetadata } from "./repo";
import type { DanceStepItem } from "./types";
import ObsidianApp from "./ObsidianApp";

export const VIEW_TYPE_DANCE_REPO = "dance-repo-view";

export class DanceRepoView extends ItemView {
  plugin: DanceRepoPlugin;
  root?: Root;

  constructor(leaf: WorkspaceLeaf, plugin: DanceRepoPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_DANCE_REPO;
  }
  getDisplayText(): string {
    return "Dance Library";
  }
  getIcon(): string {
    return "play-circle";
  }

  async onOpen(): Promise<void> {
    const host = this.containerEl.createDiv({ cls: "dd-react-host" });
    this.root = createRoot(host);

    // 1) scan vault for videos (respects settings.rootFolder)
    const items: DanceStepItem[] = await scanDanceSteps(this.app.vault, {
      rootFolder: this.plugin.settings.rootFolder,
    } as any);

    // 2) helper: vault path -> resource URL
    const toUrl = (vaultPath: string) =>
      this.app.vault.adapter.getResourcePath(vaultPath);

    // 3) actions for the ••• menu
    const openPath = async (p: string) => {
      const af = this.app.vault.getAbstractFileByPath(p);
      if (af instanceof TFile) {
        await this.app.workspace.getLeaf(true).openFile(af);
      } else {
        new Notice("File not found: " + p);
      }
    };

    const revealPath = async (p: string) => {
      await openPath(p);
      // typings may not expose commands; cast to any
      (this.app as any).commands?.executeCommandById?.(
        "file-explorer:reveal-active-file"
      );
    };

    const copyPath = async (p: string) => {
      try {
        await navigator.clipboard.writeText(p);
        new Notice("Path copied");
      } catch {
        new Notice("Could not copy path");
      }
    };

    const saveMeta = async (
      videoPath: string,
      meta: Partial<{ stepName: string; description: string; dance: string; style: string; class: string }>
    ) => {
      try {
        await upsertSidecarMetadata(this.app.vault, videoPath, meta);
        new Notice("Step updated");
      } catch (e) {
        console.error(e);
        new Notice("Failed to update step");
      }
    };

    // 4) mount React app
    this.root.render(
      <ObsidianApp
        items={items}
        toUrl={toUrl}
        actions={{ openPath, revealPath, copyPath, saveMeta }}
      />
    );
  }

  async onClose(): Promise<void> {
    this.root?.unmount();
  }
}
