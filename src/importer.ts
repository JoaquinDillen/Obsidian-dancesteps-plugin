import { App, Modal, Notice, Setting, TFile, normalizePath } from "obsidian";
import type { DanceRepoSettings } from "./settings";
import { VIDEO_EXTS, organizeVideoFile } from "./organize";

export function openVideoImportModal(app: App, settings: DanceRepoSettings) {
  new VideoImportModal(app, settings).open();
}

class VideoImportModal extends Modal {
  settings: DanceRepoSettings;

  // form state
  fileInput!: HTMLInputElement;
  stepName = "";
  dance = "";
  style = "";
  classLevel = "";

  constructor(app: App, settings: DanceRepoSettings) {
    super(app);
    this.settings = settings;
    this.setTitle("Import & organize video");
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    // Step Name
    new Setting(contentEl)
      .setName("Step name")
      .addText((t) =>
        t.onChange((v) => (this.stepName = v.trim()))
      );

    // Dance
    new Setting(contentEl)
      .setName("Dance")
      .addText((t) =>
        t.onChange((v) => (this.dance = v.trim()))
      );

    // Style
    new Setting(contentEl)
      .setName("Style")
      .addText((t) =>
        t.onChange((v) => (this.style = v.trim()))
      );

    // Class
    new Setting(contentEl)
      .setName("Class")
      .addText((t) =>
        t.onChange((v) => (this.classLevel = v.trim()))
      );

    // File input
    const fileRow = contentEl.createDiv({ cls: "setting-item" });
    const nameEl = fileRow.createDiv({ cls: "setting-item-name", text: "Video file" });
    const controlEl = fileRow.createDiv({ cls: "setting-item-control" });

    this.fileInput = controlEl.createEl("input", {
      type: "file",
      attr: { accept: ".mp4,.avi,.mov,.webm,.m4v,.ogg,video/*" },
    });

    // Import button
    const actions = contentEl.createDiv({ cls: "modal-button-container" });
    const btn = actions.createEl("button", { text: "Import & organize" });
    btn.addEventListener("click", () => this.handleImport());
  }

  async handleImport() {
    const file = this.fileInput.files?.[0];
    if (!file) return new Notice("Please choose a video file.");

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!VIDEO_EXTS.has(ext)) {
      return new Notice("Unsupported video format.");
    }

    try {
      // 1) stage the upload outside the library (so watcher won’t re-trigger)
      const tempFolder = "_imports";
      const tempPath = normalizePath(`${tempFolder}/${Date.now()}-${file.name}`);
      await ensureFolder(this.app, tempFolder);

      const buf = await file.arrayBuffer();
      await this.app.vault.createBinary(tempPath, buf);

      // 2) write a sidecar .md with your metadata so organizer can use it
      const mdPath = tempPath.replace(new RegExp(`\\.${ext}$`), ".md");
      const normalizeTag = (s: string) => (s || "").trim().replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const danceTag = normalizeTag(this.dance);
      const fm = [
        "---",
        `stepName: ${this.stepName || file.name.replace(/\.[^.]+$/, "")}`,
        `description:`,
        `class: ${this.classLevel || ""}`,
        `dance: ${this.dance || ""}`,
        `style: ${this.style || ""}`,
        `playCount: 0`,
        `lastPlayedAt:`,
        "thumbnail:",
        "duration:",
        "---",
        "",
        `#DanceLibrary${danceTag ? ` #${danceTag}` : ""}`,
        "",
      ].join("\n");
      await this.app.vault.create(mdPath, fm);

      // 3) run organizer to copy + rename into library structure
      const staged = this.app.vault.getAbstractFileByPath(tempPath);
      if (staged instanceof TFile) {
        await organizeVideoFile(this.app, staged, this.settings);
      }

      // 4) clean up the staged files
      const stagedMd = this.app.vault.getAbstractFileByPath(mdPath);
      if (staged) await this.app.fileManager.trashFile(staged);
      if (stagedMd) await this.app.fileManager.trashFile(stagedMd);

      new Notice("Video imported.");
      this.close();
    } catch (e: any) {
      console.error(e);
      new Notice("Import failed: " + (e?.message || e));
    }
  }
}

async function ensureFolder(app: App, folder: string) {
  const parts = folder.split("/").filter(Boolean);
  let cur = "";
  for (const p of parts) {
    cur = cur ? `${cur}/${p}` : p;
    if (!app.vault.getAbstractFileByPath(cur)) {
      try { await app.vault.createFolder(cur); } catch {}
    }
  }
}
