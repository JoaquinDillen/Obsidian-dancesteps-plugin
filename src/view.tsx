import { ItemView, WorkspaceLeaf, Notice, TFile, normalizePath } from "obsidian";
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
    // Remove default view padding to pull header flush to the top
    this.containerEl.addClass("dr-view");
    // Ensure the content element has no padding/margins inline (overrides theme quirks)
    (this.containerEl as HTMLElement).style.padding = "0";
    (this.containerEl as HTMLElement).style.margin = "0";
    // Compact the Obsidian view header for this leaf so our in-app header sits at the very top
    const leafEl = this.containerEl.closest('.workspace-leaf') as HTMLElement | null;
    if (leafEl) leafEl.classList.add('dr-compact-header');
    // Fallback: directly mark the header element to collapse in case class scoping misses
    const headerEl = this.containerEl.closest('.workspace-leaf-content')?.querySelector('.view-header') as HTMLElement | null;
    if (headerEl) headerEl.setAttribute('data-dr-compact', '1');

    // Defensive: remove any stray sibling .view-content elements that could push content down
    const leafContent = this.containerEl.closest('.workspace-leaf-content');
    if (leafContent) {
      const siblings = Array.from(leafContent.querySelectorAll(':scope > .view-content')) as HTMLElement[];
      for (const el of siblings) {
        if (el !== this.containerEl && el.childElementCount === 0) {
          // Only remove empty stray containers
          el.remove();
        }
      }
    }
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

    const ensureFolder = async (folder: string) => {
      const parts = folder.split("/").filter(Boolean);
      let cur = "";
      for (const p of parts) {
        cur = cur ? `${cur}/${p}` : p;
        const af = this.app.vault.getAbstractFileByPath(cur);
        if (!af) {
          try { await this.app.vault.createFolder(cur); } catch {}
        }
      }
    };

    const slug = (input?: string) => {
      const s = (input ?? "").trim();
      if (!s) return "";
      return s
        .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
    };

    const uniquePath = (full: string) => {
      const ext = full.split(".").pop()!;
      const base = full.slice(0, -(ext.length + 1));
      if (!this.app.vault.getAbstractFileByPath(full)) return full;
      let i = 2;
      let candidate = `${base} ${i}.${ext}`;
      while (this.app.vault.getAbstractFileByPath(candidate)) {
        i++;
        candidate = `${base} ${i}.${ext}`;
      }
      return candidate;
    };

    const importVideo = async (file: File) => {
      // Decide destination folder: <libraryRoot>/Imported
      const root = (this.plugin.settings.libraryRoot || "Dance").trim() || "Dance";
      const destFolder = normalizePath(`${root}/Imported`);
      await ensureFolder(destFolder);
      const name = file.name;
      const dot = name.lastIndexOf(".");
      const ext = dot >= 0 ? name.slice(dot + 1) : "mp4";
      const stem = dot >= 0 ? name.slice(0, dot) : name;
      const safe = slug(stem) || `video-${Date.now()}`;
      let destPath = normalizePath(`${destFolder}/${safe}.${ext}`);
      destPath = uniquePath(destPath);
      const buf = await file.arrayBuffer();
      await this.app.vault.createBinary(destPath, buf);
      // Minimal item; description/others can be added in the editor and saved to sidecar
      const ds: DanceStepItem = {
        path: destPath,
        basename: safe,
        ext,
        name: stem,
        description: "",
        dance: undefined,
        style: undefined,
        classLevel: undefined,
        thumbPath: undefined,
      };
      return ds;
    };

    const deletePath = async (p: string) => {
      try {
        const af = this.app.vault.getAbstractFileByPath(p);
        if (af instanceof TFile) {
          // delete sidecar md first if present
          const mdPath = normalizePath(`${af.parent?.path ?? ""}/${af.basename}.md`);
          const md = this.app.vault.getAbstractFileByPath(mdPath);
          if (md instanceof TFile) {
            await this.app.vault.delete(md);
          }
          await this.app.vault.delete(af);
          new Notice("Step deleted");
        } else {
          new Notice("File not found: " + p);
        }
      } catch (e) {
        console.error(e);
        new Notice("Failed to delete step");
      }
    };

    // 4) mount React app
    const onboardingNeeded = !this.plugin.settings.onboardingSeen;
    const markOnboardingSeen = async () => {
      if (!this.plugin.settings.onboardingSeen) {
        this.plugin.settings.onboardingSeen = true;
        await this.plugin.saveSettings();
      }
    };

    this.root.render(
      <ObsidianApp
        items={items}
        toUrl={toUrl}
        actions={{ openPath, revealPath, copyPath, saveMeta, importVideo, deletePath }}
        onboardingNeeded={onboardingNeeded}
        onOnboardingComplete={markOnboardingSeen}
      />
    );
  }

  async onClose(): Promise<void> {
    this.root?.unmount();
    const leafEl = this.containerEl.closest('.workspace-leaf') as HTMLElement | null;
    if (leafEl) leafEl.classList.remove('dr-compact-header');
    const headerEl = this.containerEl.closest('.workspace-leaf-content')?.querySelector('.view-header') as HTMLElement | null;
    if (headerEl) headerEl.removeAttribute('data-dr-compact');
  }
}
/**
 * Custom workspace view wrapping the external React app.
 *
 * Hosts the plugin UI inside an Obsidian WorkspaceLeaf and wires lifecycle
 * methods so the view cleans up correctly when detached.
 */
