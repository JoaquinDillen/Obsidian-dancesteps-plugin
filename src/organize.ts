import { App, Notice, TAbstractFile, TFile, normalizePath } from "obsidian";
import type { DanceRepoSettings } from "./settings";

export const VIDEO_EXTS = new Set(["mp4", "mov", "webm", "m4v", "ogg"]);

// --- helpers --------------------------------------------------------------

function slug(input?: string) {
  const s = (input ?? "").trim();
  if (!s) return "";
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")      // remove accents
    .replace(/[^a-zA-Z0-9]+/g, "-")       // non-word -> dashes
    .replace(/^-+|-+$/g, "")              // trim dashes
    .toLowerCase();
}

function applyTemplate(tpl: string, data: Record<string, string>) {
  return (tpl || "").replace(/\{(\w+)\}/g, (_, k) => data[k] ?? "");
}

async function ensureFolder(app: App, folder: string) {
  const parts = folder.split("/").filter(Boolean);
  let cur = "";
  for (const p of parts) {
    cur = cur ? `${cur}/${p}` : p;
    const af = app.vault.getAbstractFileByPath(cur);
    if (!af) {
      try {
        await app.vault.createFolder(cur);
      } catch {
        // ignore if created concurrently
      }
    }
  }
}

function uniqueIfExists(app: App, fullPath: string) {
  const ext = fullPath.split(".").pop()!;
  const base = fullPath.slice(0, -(ext.length + 1));
  if (!app.vault.getAbstractFileByPath(fullPath)) return fullPath;
  let i = 2;
  let candidate = `${base} ${i}.${ext}`;
  while (app.vault.getAbstractFileByPath(candidate)) {
    i++;
    candidate = `${base} ${i}.${ext}`;
  }
  return candidate;
}

async function readSidecarFrontmatter(app: App, file: TFile) {
  // look for "<basename>.md" next to the video
  const mdPath = normalizePath(`${file.parent?.path ?? ""}/${file.basename}.md`);
  const md = app.vault.getAbstractFileByPath(mdPath);
  if (md instanceof TFile) {
    const cache = app.metadataCache.getFileCache(md);
    const fm: any = cache?.frontmatter ?? {};
    return {
      stepName: fm.stepName ?? file.basename,
      description: fm.description ?? "",
      class: fm.class ?? fm.classLevel ?? "",
      dance: fm.dance ?? "",
      style: fm.style ?? "",
    };
  }
  // fallback to filename only
  return {
    stepName: file.basename,
    description: "",
    class: "",
    dance: "",
    style: "",
  };
}

// --- main API -------------------------------------------------------------

export async function organizeVideoFile(app: App, file: TFile, settings: DanceRepoSettings) {
  const ext = file.extension.toLowerCase();
  if (!VIDEO_EXTS.has(ext)) return;

  const meta = await readSidecarFrontmatter(app, file);

  const root = (settings.libraryRoot || "Dance").trim();
  const folderTpl = settings.organizeTemplate || "{dance}/{style}/{class}";
  const nameTpl = settings.filenameTemplate || "{stepName}";

  const relFolder = applyTemplate(folderTpl, {
    dance: slug(meta.dance),
    style: slug(meta.style),
    class: slug(meta.class),
    stepName: slug(meta.stepName),
  }).replace(/\/+/g, "/").replace(/^\/|\/$/g, "");

  const destFolder = normalizePath(`${root}/${relFolder}`);
  await ensureFolder(app, destFolder);

  const baseName = applyTemplate(nameTpl, { stepName: slug(meta.stepName) }) || slug(file.basename);
  let destPath = normalizePath(`${destFolder}/${baseName}.${ext}`);
  destPath = uniqueIfExists(app, destPath);

  // copy the binary into the organized location
  const bin = await app.vault.readBinary(file);
  await app.vault.createBinary(destPath, bin);

  // create a sidecar MD with frontmatter (if not already present)
  const destMd = destPath.replace(new RegExp(`\\.${ext}$`), ".md");
  if (!app.vault.getAbstractFileByPath(destMd)) {
    const fm = [
      "---",
      `stepName: ${meta.stepName ?? file.basename}`,
      `description: ${meta.description ?? ""}`,
      `class: ${meta.class ?? ""}`,
      `dance: ${meta.dance ?? ""}`,
      `style: ${meta.style ?? ""}`,
      "thumbnail:",
      "duration:",
      "---",
      "",
    ].join("\n");
    await app.vault.create(destMd, fm);
  }

  new Notice(`Organized: ${destPath}`);
}
