/**
 * Obsidian plugin entrypoint
 *
 * Registers the custom Dance Repository view, a ribbon icon and command to
 * open it, and exposes plugin settings. Keeps lifecycle clean and idempotent.
 */
import { Plugin, WorkspaceLeaf, TFile, Notice, addIcon } from "obsidian";
import dancingIcon from "./src/ui/dancing-svgrepo-com.svg";
import { DanceRepoSettingTab, DEFAULT_SETTINGS, type DanceRepoSettings } from "./src/settings";
import { DanceRepoView, VIEW_TYPE_DANCE_REPO } from "./src/view";
import { organizeVideoFile, VIDEO_EXTS } from "./src/organize";

/** Main plugin class responsible for Obsidian lifecycle integration. */
export default class DanceRepoPlugin extends Plugin {
    settings: DanceRepoSettings;

    async onload() {
        // Load persisted settings (with defaults)
        await this.loadSettings();

        // Register the custom dancing SVG from src/ui for ribbon/tab use
        // Normalize the SVG to remove fixed size and use currentColor
        const normalizedDancingIcon = dancingIcon
            .replace(/<\?xml[^>]*>/g, "")
            .replace(/<!--[\s\S]*?-->/g, "")
            .replace(/\s(width|height)\s*=\s*"[^"]*"/g, "")
            .replace(/fill\s*=\s*"#[0-9a-fA-F]{3,6}"/g, 'fill="currentColor"');
        addIcon("dance", normalizedDancingIcon);

        this.registerView(
            VIEW_TYPE_DANCE_REPO,
            (leaf: WorkspaceLeaf) => new DanceRepoView(leaf, this)
        );

        // Ribbon shortcut to open the main view
        this.addRibbonIcon("dance", "Open Dance Repository", () => this.activateView());

        this.addCommand({
            id: "open-dance-repository",
            name: "Open Dance Repository",
            callback: () => this.activateView(),
        });

        this.addSettingTab(new DanceRepoSettingTab(this.app, this));
    }

    async activateView() {
        const { workspace } = this.app;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_DANCE_REPO);
        let leaf: WorkspaceLeaf | null = leaves.length > 0 ? leaves[0] : null;
        if (!leaf) {
            // Prefer opening as a main tab (not a sidebar widget), including on mobile
            const getTabLeaf = (workspace as unknown as { getLeaf?: (type?: string | boolean) => WorkspaceLeaf }).getLeaf?.bind(workspace);
            const target: WorkspaceLeaf = getTabLeaf ? getTabLeaf('tab') : workspace.getLeaf(true);
            await target.setViewState({ type: VIEW_TYPE_DANCE_REPO, active: true });
            leaf = target;
        }
        if (leaf) workspace.revealLeaf(leaf);
    }

    async onunload() {
        // Detach the custom view on unload to avoid leaks
        this.app.workspace.getLeavesOfType(VIEW_TYPE_DANCE_REPO).forEach((leaf) => leaf.detach());
    }

    async loadSettings() {
        // Merge stored data with defaults to ensure all fields exist
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        // Persist settings (called by the settings tab)
        await this.saveData(this.settings);
    }
}
