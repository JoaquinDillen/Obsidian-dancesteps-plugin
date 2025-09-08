import { App, Modal } from "obsidian";
import type { DanceStepItem } from "../types";

export class LibraryModal extends Modal {
  private items: DanceStepItem[];
  private onPick: (index: number) => void;

  constructor(app: App, items: DanceStepItem[], onPick: (index: number) => void) {
    super(app);
    this.items = items;
    this.onPick = onPick;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass("dance-repo-library");

    const grid = contentEl.createDiv({ cls: "dance-repo-grid" });

    this.items.forEach((item, idx) => {
      const card = grid.createDiv({ cls: "dance-repo-card" });
      const thumb = card.createDiv({ cls: "dance-repo-thumb" });
      if (item.thumbPath) {
        const img = thumb.createEl("img", { attr: { src: this.app.vault.adapter.getResourcePath(item.thumbPath) } });
        img.alt = item.name;
      } else {
        thumb.createEl("div", { text: item.name[0]?.toUpperCase() ?? "?", cls: "dance-repo-thumb-fallback" });
      }
      const info = card.createDiv({ cls: "dance-repo-card-info" });
      info.createEl("div", { text: item.name, cls: "dance-repo-card-title" });
      const meta = [item.dance, item.style, item.classLevel].filter(Boolean).join(" • ");
      if (meta) info.createEl("div", { text: meta, cls: "dance-repo-card-meta" });

      card.onClickEvent(() => {
        this.onPick(idx);
        this.close();
      });
    });
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}

