/**
 * Plugin settings: schema, defaults, and settings tab UI.
 *
 * Provides a declarative, self-contained settings editor and an interface
 * `DanceRepoSettings` with sane defaults in `DEFAULT_SETTINGS`.
 */
import { App, PluginSettingTab, Setting } from "obsidian";
import { scanDanceSteps } from "./repo";
import type DanceRepoPlugin from "../main";

/** Configuration saved with the plugin. */
export interface DanceRepoSettings {
  rootFolder: string; // where to scan for videos; empty to scan whole vault
  autoplay: boolean;
  showControls: boolean;
  libraryRoot: string;            // top-level folder where organized videos go (e.g., "Dance")
  organizeTemplate: string;       // folders under libraryRoot, e.g. "{dance}/{style}/{class}"
  filenameTemplate: string;       // file name pattern, e.g. "{stepName}"
  autoOrganizeNew: boolean;       // watch vault & auto-organize new video files
  // Default filters for the library view
  defaultFilterClasses: string;   // comma-separated list of class names/levels to include by default
  defaultFilterDances: string;    // comma-separated list of dance types to include by default
  defaultFilterStyles: string;    // comma-separated list of styles/variants to include by default
  // Onboarding
  onboardingSeen: boolean;        // whether the welcome tour has been shown
}

export const DEFAULT_SETTINGS: DanceRepoSettings = {
  rootFolder: "",
  autoplay: true,
  showControls: true,
  libraryRoot: "Dance",
  organizeTemplate: "{dance}/{style}/{class}",
  filenameTemplate: "{stepName}",
  autoOrganizeNew: true,
  defaultFilterClasses: "",
  defaultFilterDances: "", // e.g., "Salsa,Bachata"
  defaultFilterStyles: "", // e.g., "On1,Sensual"
  onboardingSeen: false,
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
    containerEl.addClass("dr-settings");

    containerEl.createEl("h3", { text: "Dance Repository Settings" });

    new Setting(containerEl)
      .setName("Root folder")
      .setDesc(
        "Vault-relative folder to scan for videos (leave blank for entire vault)."
      )
      .addText((t) => {
        t.setPlaceholder("e.g. Dance/")
          .setValue(this.plugin.settings.rootFolder)
          .then(() => { (t.inputEl as HTMLInputElement).style.width = "100%"; })
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

    new Setting(containerEl)
      .setName("Library root")
      .setDesc("All imported videos will be copied inside this folder.")
      .addText(t => t
        .setPlaceholder("Dance")
        .setValue(this.plugin.settings.libraryRoot)
        .then(() => { (t.inputEl as HTMLInputElement).style.width = "100%"; })
        .onChange(async v => { this.plugin.settings.libraryRoot = v || "Dance"; await this.plugin.saveSettings(); })
      );

    new Setting(containerEl)
      .setName("Folder template")
      .setDesc("Subfolders under the library root. Placeholders: {dance} {style} {class}")
      .addText(t => t
        .setPlaceholder("{dance}/{style}/{class}")
        .setValue(this.plugin.settings.organizeTemplate)
        .then(() => { (t.inputEl as HTMLInputElement).style.width = "100%"; })
        .onChange(async v => { this.plugin.settings.organizeTemplate = v || "{dance}/{style}/{class}"; await this.plugin.saveSettings(); })
      );

    new Setting(containerEl)
      .setName("Filename template")
      .setDesc("Final filename (without extension). Placeholders: {stepName}")
      .addText(t => t
        .setPlaceholder("{stepName}")
        .setValue(this.plugin.settings.filenameTemplate)
        .then(() => { (t.inputEl as HTMLInputElement).style.width = "100%"; })
        .onChange(async v => { this.plugin.settings.filenameTemplate = v || "{stepName}"; await this.plugin.saveSettings(); })
      );

    new Setting(containerEl)
      .setName("Auto-organize new videos")
      .setDesc("When a new video appears in the vault, copy/rename it into the library using the templates.")
      .addToggle(t => t
        .setValue(this.plugin.settings.autoOrganizeNew)
        .onChange(async v => { this.plugin.settings.autoOrganizeNew = v; await this.plugin.saveSettings(); })
      );

    containerEl.createEl("h4", { text: "Default library filters" });

    const parseCSV = (s: string) => (s || "").split(",").map(x => x.trim()).filter(Boolean);
    const unique = (arr: string[]) => Array.from(new Set(arr)).sort((a,b)=>a.localeCompare(b));

    let selectedClasses = unique(parseCSV(this.plugin.settings.defaultFilterClasses));
    let selectedDances = unique(parseCSV(this.plugin.settings.defaultFilterDances));
    let selectedStyles = unique(parseCSV(this.plugin.settings.defaultFilterStyles));

    // Classes row: chips + dropdown + tools
    const classSetting = new Setting(containerEl)
      .setName("Classes")
      .setDesc("Select default classes (levels/groups)");

    const classChips = classSetting.controlEl.createDiv({ cls: "dr-settings-chips" });
    const classSelect = classSetting.controlEl.createEl("select");
    classSelect.classList.add("dropdown");
    // Inline actions beside section title
    const classNameEl = (classSetting as any).nameEl as HTMLElement;
    classNameEl.classList.add("dr-settings-name-row");
    const classActions = classNameEl.createDiv({ cls: "dr-settings-inline-actions" });
    const classSelectAllBtn = classActions.createEl("button", { text: "Select all" });
    const classClearBtn = classActions.createEl("button", { text: "Clear" });
    classSelectAllBtn.addClass("dr-btn");
    classClearBtn.addClass("dr-btn", "ghost");
    const addClassOption = (value: string, label?: string) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label ?? value;
      classSelect.appendChild(opt);
    };
    addClassOption("", "Add class...");
    classSelect.onchange = async () => {
      const val = classSelect.value;
      if (val) {
        if (!selectedClasses.includes(val)) {
          selectedClasses = unique([...selectedClasses, val]);
          this.plugin.settings.defaultFilterClasses = selectedClasses.join(",");
          await this.plugin.saveSettings();
          renderClassChips();
          populateClassOptions();
        }
        classSelect.value = "";
      }
    };
    let availableClasses: string[] = [];
    const renderClassChips = () => {
      classChips.empty();
      selectedClasses.forEach((c) => {
        const chip = classChips.createEl("button", { text: c, cls: "dr-chip selected" });
        chip.onclick = async () => {
          selectedClasses = selectedClasses.filter(x => x !== c);
          this.plugin.settings.defaultFilterClasses = selectedClasses.join(",");
          await this.plugin.saveSettings();
          renderClassChips();
          populateClassOptions();
        };
      });
    };
    classSelectAllBtn.onclick = async () => {
      if (availableClasses.length) {
        selectedClasses = unique(availableClasses);
        this.plugin.settings.defaultFilterClasses = selectedClasses.join(",");
        await this.plugin.saveSettings();
        renderClassChips();
        populateClassOptions();
      }
    };
    classClearBtn.onclick = async () => {
      selectedClasses = [];
      this.plugin.settings.defaultFilterClasses = "";
      await this.plugin.saveSettings();
      renderClassChips();
      populateClassOptions();
    };

    // Onboarding section
    containerEl.createEl("h4", { text: "Onboarding" });
    new Setting(containerEl)
      .setName("Welcome tour")
      .setDesc("Show the first-time tour the next time you open the Dance Library view.")
      .addButton(btn => btn
        .setButtonText("Show again")
        .onClick(async () => {
          this.plugin.settings.onboardingSeen = false;
          await this.plugin.saveSettings();
          new (window as any).Notice?.("Welcome tour will show next time")
        })
      );

    // Dance types row: chips + dropdown + tools
    const danceSetting = new Setting(containerEl)
      .setName("Dance types")
      .setDesc("Select default dance types");

    const danceChips = danceSetting.controlEl.createDiv({ cls: "dr-settings-chips" });
    const danceSelect = danceSetting.controlEl.createEl("select");
    danceSelect.classList.add("dropdown");
    // Inline actions beside section title
    const danceNameEl = (danceSetting as any).nameEl as HTMLElement;
    danceNameEl.classList.add("dr-settings-name-row");
    const danceActions = danceNameEl.createDiv({ cls: "dr-settings-inline-actions" });
    const danceSelectAllBtn = danceActions.createEl("button", { text: "Select all" });
    const danceClearBtn = danceActions.createEl("button", { text: "Clear" });
    danceSelectAllBtn.addClass("dr-btn");
    danceClearBtn.addClass("dr-btn", "ghost");
    const addDanceOption = (value: string, label?: string) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label ?? value;
      danceSelect.appendChild(opt);
    };
    addDanceOption("", "Add dance type...");
    danceSelect.onchange = async () => {
      const val = danceSelect.value;
      if (val) {
        if (!selectedDances.includes(val)) {
          selectedDances = unique([...selectedDances, val]);
          this.plugin.settings.defaultFilterDances = selectedDances.join(",");
          await this.plugin.saveSettings();
          renderDanceChips();
          populateDanceOptions();
        }
        danceSelect.value = "";
      }
    };

    let availableDances: string[] = [];

    const renderDanceChips = () => {
      danceChips.empty();
      selectedDances.forEach((d) => {
        const chip = danceChips.createEl("button", { text: d, cls: "dr-chip selected" });
        chip.onclick = async () => {
          selectedDances = selectedDances.filter(x => x !== d);
          this.plugin.settings.defaultFilterDances = selectedDances.join(",");
          await this.plugin.saveSettings();
          renderDanceChips();
          populateDanceOptions();
        };
      });
    };
    danceSelectAllBtn.onclick = async () => {
      if (availableDances.length) {
        selectedDances = unique(availableDances);
        this.plugin.settings.defaultFilterDances = selectedDances.join(",");
        await this.plugin.saveSettings();
        renderDanceChips();
        populateDanceOptions();
      }
    };
    danceClearBtn.onclick = async () => {
      selectedDances = [];
      this.plugin.settings.defaultFilterDances = "";
      await this.plugin.saveSettings();
      renderDanceChips();
      populateDanceOptions();
    };

    // Styles row: chips + dropdown + tools
    const styleSetting = new Setting(containerEl)
      .setName("Styles / variants")
      .setDesc("Select default styles/variants");

    const styleChips = styleSetting.controlEl.createDiv({ cls: "dr-settings-chips" });
    const styleSelect = styleSetting.controlEl.createEl("select");
    styleSelect.classList.add("dropdown");
    // Inline actions beside section title
    const styleNameEl = (styleSetting as any).nameEl as HTMLElement;
    styleNameEl.classList.add("dr-settings-name-row");
    const styleActions = styleNameEl.createDiv({ cls: "dr-settings-inline-actions" });
    const styleSelectAllBtn = styleActions.createEl("button", { text: "Select all" });
    const styleClearBtn = styleActions.createEl("button", { text: "Clear" });
    styleSelectAllBtn.addClass("dr-btn");
    styleClearBtn.addClass("dr-btn", "ghost");
    const addStyleOption = (value: string, label?: string) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label ?? value;
      styleSelect.appendChild(opt);
    };
    addStyleOption("", "Add style/variant...");
    styleSelect.onchange = async () => {
      const val = styleSelect.value;
      if (val) {
        if (!selectedStyles.includes(val)) {
          selectedStyles = unique([...selectedStyles, val]);
          this.plugin.settings.defaultFilterStyles = selectedStyles.join(",");
          await this.plugin.saveSettings();
          renderStyleChips();
          populateStyleOptions();
        }
        styleSelect.value = "";
      }
    };

    let availableStyles: string[] = [];

    const renderStyleChips = () => {
      styleChips.empty();
      selectedStyles.forEach((s) => {
        const chip = styleChips.createEl("button", { text: s, cls: "dr-chip selected" });
        chip.onclick = async () => {
          selectedStyles = selectedStyles.filter(x => x !== s);
          this.plugin.settings.defaultFilterStyles = selectedStyles.join(",");
          await this.plugin.saveSettings();
          renderStyleChips();
          populateStyleOptions();
        };
      });
    };
    styleSelectAllBtn.onclick = async () => {
      if (availableStyles.length) {
        selectedStyles = unique(availableStyles);
        this.plugin.settings.defaultFilterStyles = selectedStyles.join(",");
        await this.plugin.saveSettings();
        renderStyleChips();
        populateStyleOptions();
      }
    };
    styleClearBtn.onclick = async () => {
      selectedStyles = [];
      this.plugin.settings.defaultFilterStyles = "";
      await this.plugin.saveSettings();
      renderStyleChips();
      populateStyleOptions();
    };

    // Populate dropdowns from current vault
    const populateClassOptions = async () => {
      const keep = classSelect.firstElementChild as HTMLOptionElement | null;
      classSelect.innerHTML = "";
      if (keep) classSelect.appendChild(keep);
      const steps = await scanDanceSteps(this.app.vault, { rootFolder: this.plugin.settings.rootFolder });
      const classes = unique(steps.map(s => s.classLevel).filter(Boolean) as string[]);
      availableClasses = classes;
      classes.filter(c => !selectedClasses.includes(c)).forEach(c => addClassOption(c));
    };

    const populateDanceOptions = async () => {
      // ensure we only keep placeholder, then add options not selected
      const keep = danceSelect.firstElementChild as HTMLOptionElement | null;
      danceSelect.innerHTML = "";
      if (keep) danceSelect.appendChild(keep);
      const steps = await scanDanceSteps(this.app.vault, { rootFolder: this.plugin.settings.rootFolder });
      const dances = unique(steps.map(s => s.dance).filter(Boolean) as string[]);
      availableDances = dances;
      dances.filter(d => !selectedDances.includes(d)).forEach(d => addDanceOption(d));
    };

    const populateStyleOptions = async () => {
      const keep = styleSelect.firstElementChild as HTMLOptionElement | null;
      styleSelect.innerHTML = "";
      if (keep) styleSelect.appendChild(keep);
      const steps = await scanDanceSteps(this.app.vault, { rootFolder: this.plugin.settings.rootFolder });
      const styles = unique(steps.map(s => s.style).filter(Boolean) as string[]);
      availableStyles = styles;
      styles.filter(s => !selectedStyles.includes(s)).forEach(s => addStyleOption(s));
    };

    renderClassChips();
    containerEl.createDiv({ cls: "dr-settings-sep" });
    renderDanceChips();
    containerEl.createDiv({ cls: "dr-settings-sep" });
    renderStyleChips();
    containerEl.createDiv({ cls: "dr-settings-sep" });
    // Load options in background
    populateClassOptions();
    populateDanceOptions();
    populateStyleOptions();
  }
}
