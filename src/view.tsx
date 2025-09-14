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
    return "dance";
  }

  async onOpen(): Promise<void> {
    // Remove default view padding to pull header flush to the top
    this.containerEl.addClass("dr-view");
    // Styling handled via CSS classes to respect themes/snippets
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
    });

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
      // typings may not expose commands on App; feature-detect safely
      const maybeCommands = (this.app as unknown as { commands?: { executeCommandById?: (id: string) => void } }).commands;
      if (maybeCommands && typeof maybeCommands.executeCommandById === 'function') {
        maybeCommands.executeCommandById("file-explorer:reveal-active-file");
      }
    };

    const copyPath = async (p: string) => {
      try {
        await navigator.clipboard.writeText(p);
        new Notice("Path copied");
      } catch {
        new Notice("Could not copy path");
      }
    };

    // Helpers used by metadata save/rename
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

    const saveMeta = async (
      videoPath: string,
      meta: Partial<{ stepName: string; description: string; dance: string; style: string; class: string; playCount: number; lastPlayedAt: number }>
    ): Promise<string | void> => {
      try {
        let finalPath = videoPath;
        // If stepName provided, consider renaming the underlying video + sidecar to match
        const desired = (meta.stepName || "").trim();
        if (desired) {
          const af = this.app.vault.getAbstractFileByPath(videoPath);
          if (af instanceof TFile) {
            const parentPath = af.parent?.path || "";
            const ext = af.extension;
            const currentBase = af.basename;
            const targetSlug = slug(desired) || `video-${Date.now()}`;
            if (targetSlug !== currentBase) {
              // compute unique new video path and rename
              const intendedVideo = normalizePath(`${parentPath}/${targetSlug}.${ext}`);
              const newVideoPath = uniquePath(intendedVideo);
              await this.app.vault.rename(af, newVideoPath);
              finalPath = newVideoPath;
              // try to move sidecar .md to match new basename
              const oldMdPath = normalizePath(`${parentPath}/${currentBase}.md`);
              const newBase = newVideoPath.substring(newVideoPath.lastIndexOf("/") + 1, newVideoPath.lastIndexOf("."));
              const targetMdPath = normalizePath(`${parentPath}/${newBase}.md`);
              const mdAf = this.app.vault.getAbstractFileByPath(oldMdPath);
              if (mdAf instanceof TFile) {
                const conflict = this.app.vault.getAbstractFileByPath(targetMdPath);
                if (!conflict) {
                  try { await this.app.vault.rename(mdAf, targetMdPath); } catch {}
                }
              }
            }
          }
        }

        // Upsert metadata on the (possibly renamed) file
        await upsertSidecarMetadata(this.app.vault, finalPath, meta);
        // Cleanup: if an old sidecar remains (due to conflict preventing rename), remove it
        if (finalPath !== videoPath) {
          const oldParent = videoPath.substring(0, videoPath.lastIndexOf("/"));
          const oldBase = videoPath.substring(videoPath.lastIndexOf("/") + 1, videoPath.lastIndexOf("."));
          const oldMdPath = normalizePath(`${oldParent}/${oldBase}.md`);
          const newParent = finalPath.substring(0, finalPath.lastIndexOf("/"));
          const newBase = finalPath.substring(finalPath.lastIndexOf("/") + 1, finalPath.lastIndexOf("."));
          const newMdPath = normalizePath(`${newParent}/${newBase}.md`);
          const oldMd = this.app.vault.getAbstractFileByPath(oldMdPath);
          const newMd = this.app.vault.getAbstractFileByPath(newMdPath);
          if (oldMd && newMd && oldMdPath !== newMdPath && oldMd instanceof TFile) {
            try { await this.app.fileManager.trashFile(oldMd); } catch {}
          }
        }
        new Notice("Step updated");
        if (finalPath !== videoPath) return finalPath;
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
            await this.app.fileManager.trashFile(md);
          }
          await this.app.fileManager.trashFile(af);
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
