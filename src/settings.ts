import { App, PluginSettingTab, Setting } from "obsidian";
import type DanceRepoPlugin from "../main";

export interface DanceRepoSettings {
  rootFolder: string; // where to scan for videos; empty to scan whole vault
  autoplay: boolean;
  showControls: boolean;
}

export const DEFAULT_SETTINGS: DanceRepoSettings = {
  rootFolder: "",
  autoplay: true,
  showControls: true,
};

export class DanceRepoSettingTab extends PluginSettingTab {
  plugin: DanceRepoPlugin;

  constructor(app: App, plugin: DanceRepoPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h3", { text: "Dance Repository Settings" });

    new Setting(containerEl)
      .setName("Root folder")
      .setDesc(
        "Vault-relative folder to scan for videos (leave blank for entire vault)."
      )
      .addText((t) => {
        t.setPlaceholder("e.g. Dance/")
          .setValue(this.plugin.settings.rootFolder)
          .onChange(async (val) => {
            this.plugin.settings.rootFolder = val.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Autoplay")
      .setDesc("Start playing automatically when switching videos.")
      .addToggle((t) => {
        t.setValue(this.plugin.settings.autoplay).onChange(async (val) => {
          this.plugin.settings.autoplay = val;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Show controls")
      .setDesc("Show native video controls (play/pause, seek, etc.)")
      .addToggle((t) => {
        t.setValue(this.plugin.settings.showControls).onChange(async (val) => {
          this.plugin.settings.showControls = val;
          await this.plugin.saveSettings();
        });
      });
  }
}

