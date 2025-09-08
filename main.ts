import { Plugin, WorkspaceLeaf } from "obsidian";
import { DanceRepoSettingTab, DEFAULT_SETTINGS, type DanceRepoSettings } from "./src/settings";
import { DanceRepoView, VIEW_TYPE_DANCE_REPO } from "./src/view";

export default class DanceRepoPlugin extends Plugin {
    settings: DanceRepoSettings;

    async onload() {
        await this.loadSettings();

        this.registerView(
            VIEW_TYPE_DANCE_REPO,
            (leaf: WorkspaceLeaf) => new DanceRepoView(leaf, this)
        );

        this.addRibbonIcon("play-circle", "Open Dance Repository", () => this.activateView());

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
            const target = workspace.getRightLeaf(false) ?? workspace.getLeaf(true);
            await target.setViewState({ type: VIEW_TYPE_DANCE_REPO, active: true });
            leaf = target;
        }
        if (leaf) workspace.revealLeaf(leaf);
    }

    async onunload() {
        this.app.workspace.getLeavesOfType(VIEW_TYPE_DANCE_REPO).forEach((leaf) => leaf.detach());
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
