import { Vault, TFile, parseYaml, normalizePath } from "obsidian";
import type { DanceStepItem } from "./types";

const VIDEO_EXTS = new Set(["mp4", "webm", "mov", "m4v", "ogg"]);
const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

function isVideo(file: TFile): boolean {
  return VIDEO_EXTS.has(file.extension.toLowerCase());
}

function findThumbFor(vault: Vault, file: TFile): TFile | null {
  const parent = file.parent;
  if (!parent) return null;
  const base = file.basename.toLowerCase();
  for (const child of parent.children) {
    if (child instanceof TFile) {
      const ext = child.extension.toLowerCase();
      if (IMAGE_EXTS.has(ext) && child.basename.toLowerCase() === base) {
        return child;
      }
    }
  }
  return null;
}

async function readSidecarDescription(vault: Vault, file: TFile): Promise<string | undefined> {
  const parent = file.parent;
  if (!parent) return undefined;
  const md = parent.children.find((c) => c instanceof TFile && c.extension.toLowerCase() === "md" && c.basename === file.basename) as TFile | undefined;
  if (!md) return undefined;
  try {
    const content = await vault.read(md);
    // try frontmatter 'description' first
    // crude parse: check for leading --- yaml ---
    if (content.startsWith("---")) {
      const end = content.indexOf("\n---", 3);
      if (end > 0) {
        const yaml = content.slice(3, end).trim();
        const data = parseYaml(yaml) as any;
        if (data && typeof data.description === "string" && data.description.trim()) {
          return String(data.description).trim();
        }
      }
    }
    // else take first non-empty line
    const line = content.split(/\r?\n/).find((l) => l.trim().length > 0);
    return line?.trim();
  } catch {
    return undefined;
  }
}

export interface ScanOptions {
  rootFolder?: string; // vault-relative
}

export async function scanDanceSteps(vault: Vault, opts: ScanOptions = {}): Promise<DanceStepItem[]> {
  const files = vault.getFiles();
  const root = opts.rootFolder?.trim();
  const allowedPrefix = root ? normalizePath(root + (root.endsWith("/") ? "" : "/")) : "";

  const videos = files.filter((f) => isVideo(f) && (!allowedPrefix || f.path.startsWith(allowedPrefix)));
  const items: DanceStepItem[] = [];

  for (const f of videos) {
    const relPathWithinRoot = allowedPrefix ? f.path.slice(allowedPrefix.length) : f.path;
    const parts = relPathWithinRoot.split("/");
    // infer categories from first three parent folders if present: dance/style/class
    const name = f.basename;
    const dance = parts.length > 1 ? parts[0] : undefined;
    const style = parts.length > 2 ? parts[1] : undefined;
    const classLevel = parts.length > 3 ? parts[2] : undefined;
    const thumb = findThumbFor(vault, f);
    const description = await readSidecarDescription(vault, f);

    items.push({
      path: f.path,
      basename: f.basename,
      ext: f.extension,
      name,
      description,
      dance,
      style,
      classLevel,
      thumbPath: thumb?.path,
    });
  }

  // sort by path for stable order
  items.sort((a, b) => a.path.localeCompare(b.path));
  return items;
}

