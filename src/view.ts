import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import type DanceRepoPlugin from "../main";
import type { DanceRepoState, DanceStepItem } from "./types";
import { scanDanceSteps } from "./repo";
import { LibraryModal } from "./ui/libraryModal";

export const VIEW_TYPE_DANCE_REPO = "dance-repo-view";

export class DanceRepoView extends ItemView {
  plugin: DanceRepoPlugin;
  state: DanceRepoState = { items: [], currentIndex: 0 };
  container!: HTMLDivElement;
  videoEl!: HTMLVideoElement;
  overlayTitle!: HTMLDivElement;
  overlayDesc!: HTMLDivElement;

  private touchStartX: number | null = null;
  private touchStartY: number | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: DanceRepoPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_DANCE_REPO;
  }

  getDisplayText(): string {
    return "Dance Repository";
  }

  getIcon(): string {
    return "play-circle";
  }

  async onOpen(): Promise<void> {
    const root = this.containerEl.createDiv({ cls: "dance-repo-root" });

    // Header with actions
    const header = root.createDiv({ cls: "dance-repo-header" });
    const title = header.createDiv({ cls: "dance-repo-header-title", text: "Dance Repository" });
    const actions = header.createDiv({ cls: "dance-repo-actions" });

    const libBtn = actions.createEl("button", { cls: "dance-repo-btn", text: "Library" });
    libBtn.onclick = () => this.openLibrary();

    // Phone-like frame
    this.container = root.createDiv({ cls: "dance-repo-phone" });

    const leftNav = this.container.createDiv({ cls: "dance-repo-nav left" });
    setIcon(leftNav, "chevron-left");
    leftNav.onclick = () => this.prev();

    const rightNav = this.container.createDiv({ cls: "dance-repo-nav right" });
    setIcon(rightNav, "chevron-right");
    rightNav.onclick = () => this.next();

    const videoWrap = this.container.createDiv({ cls: "dance-repo-video-wrap" });
    this.videoEl = videoWrap.createEl("video", { cls: "dance-repo-video" });
    this.videoEl.controls = this.plugin.settings.showControls;

    // touch swipe support
    this.videoEl.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
      }
    });
    this.videoEl.addEventListener("touchend", (e) => {
      if (this.touchStartX == null || this.touchStartY == null) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - this.touchStartX;
      const dy = t.clientY - this.touchStartY;
      // only horizontal swipe with some threshold
      if (Math.abs(dx) > 50 && Math.abs(dy) < 40) {
        if (dx < 0) this.next(); else this.prev();
      }
      this.touchStartX = this.touchStartY = null;
    });

    const overlay = videoWrap.createDiv({ cls: "dance-repo-overlay" });
    this.overlayTitle = overlay.createDiv({ cls: "dance-repo-title" });
    this.overlayDesc = overlay.createDiv({ cls: "dance-repo-desc" });

    // keyboard nav
    this.registerDomEvent(window, "keydown", (e) => {
      if (e.key === "ArrowLeft") this.prev();
      if (e.key === "ArrowRight") this.next();
    });

    await this.refresh();

    // react to vault changes
    this.registerEvent(
      this.app.vault.on("create", async () => {
        await this.refresh();
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", async () => {
        await this.refresh();
      })
    );
  }

  async refresh(): Promise<void> {
    const items = await scanDanceSteps(this.app.vault, { rootFolder: this.plugin.settings.rootFolder });
    this.state.items = items;
    if (this.state.currentIndex >= items.length) this.state.currentIndex = 0;
    this.renderCurrent();
  }

  openLibrary(): void {
    new LibraryModal(this.app, this.state.items, (idx) => this.goTo(idx)).open();
  }

  prev(): void {
    if (!this.state.items.length) return;
    this.state.currentIndex = (this.state.currentIndex - 1 + this.state.items.length) % this.state.items.length;
    this.renderCurrent();
  }
  next(): void {
    if (!this.state.items.length) return;
    this.state.currentIndex = (this.state.currentIndex + 1) % this.state.items.length;
    this.renderCurrent();
  }
  goTo(index: number): void {
    if (index < 0 || index >= this.state.items.length) return;
    this.state.currentIndex = index;
    this.renderCurrent();
  }

  renderCurrent(): void {
    const item = this.state.items[this.state.currentIndex];
    if (!item) {
      this.overlayTitle.setText("No videos found");
      this.overlayDesc.setText("");
      this.videoEl.removeAttribute("src");
      this.videoEl.load();
      return;
    }
    const src = this.app.vault.adapter.getResourcePath(item.path);
    this.videoEl.src = src;
    this.videoEl.controls = this.plugin.settings.showControls;
    if (this.plugin.settings.autoplay) {
      // try play; ignore errors (mobile autoplay policy)
      this.videoEl.play().catch(() => {});
    }

    const meta: string[] = [];
    if (item.dance) meta.push(item.dance);
    if (item.style) meta.push(item.style);
    if (item.classLevel) meta.push(item.classLevel);
    const subtitle = meta.join(" • ");

    this.overlayTitle.setText(item.name);
    this.overlayDesc.setText(item.description || subtitle || "");
  }

  async onClose(): Promise<void> {}
}
