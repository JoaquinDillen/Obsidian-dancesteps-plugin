import { Vault, TFile, parseYaml, normalizePath } from "obsidian";
import type { DanceStepItem } from "./types";

const VIDEO_EXTS = new Set(["mp4", "webm", "mov", "m4v", "ogg", "avi"]);
const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

type SidecarFM = {
  stepName?: string;
  description?: string;
  dance?: string;
  style?: string;
  danceStyle?: string;
  class?: string;
  classLevel?: string;
  playCount?: number;
  lastPlayedAt?: number;
  tags?: unknown;
  __body?: string;
} & Record<string, unknown>;

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
  const md = parent.children.find(
    (c) => c instanceof TFile && c.extension.toLowerCase() === "md" && c.basename === file.basename
  );
  if (!(md instanceof TFile)) return undefined;
  try {
    const content = await vault.read(md);
    // try frontmatter 'description' first
    // crude parse: check for leading --- yaml ---
    if (content.startsWith("---")) {
      const end = content.indexOf("\n---", 3);
      if (end > 0) {
        const yaml = content.slice(3, end).trim();
        const data = parseYaml(yaml) as unknown;
        if (isRecord(data) && typeof data.description === "string" && data.description.trim()) {
          return data.description.trim();
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

async function readSidecarFrontmatter(vault: Vault, file: TFile): Promise<Record<string, any> | null> {
  const parent = file.parent;
  if (!parent) return null;
  const md = parent.children.find(
    (c) => c instanceof TFile && c.extension.toLowerCase() === "md" && c.basename === file.basename
  );
  if (!(md instanceof TFile)) return null;
  try {
    const content = await vault.read(md);
    if (content.startsWith("---")) {
      const end = content.indexOf("\n---", 3);
      if (end > 0) {
        const yaml = content.slice(3, end).trim();
        const data = parseYaml(yaml) as unknown;
        return isRecord(data) ? (data as SidecarFM) : null;
      }
    }
    return null;
  } catch {
    return null;
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
    let name = f.basename;
    let dance = parts.length > 1 ? parts[0] : undefined;
    let danceStyle = parts.length > 2 ? parts[1] : undefined;
    let classLevel = parts.length > 3 ? parts[2] : undefined;
    const thumb = findThumbFor(vault, f);
    let description = await readSidecarDescription(vault, f);

    // If sidecar frontmatter exists, override with explicit values
    const fm = await readSidecarFrontmatter(vault, f);
    if (fm) {
      if (typeof fm.stepName === "string" && fm.stepName.trim()) name = fm.stepName.trim();
      if (typeof fm.description === "string" && fm.description.trim()) description = fm.description.trim();
      if (typeof fm.dance === "string" && fm.dance.trim()) dance = fm.dance.trim();
      // Frontmatter "style"/"danceStyle" denotes dance styling metadata, not CSS
      if (typeof fm.style === "string" && fm.style.trim()) danceStyle = fm.style.trim();
      if (typeof fm.danceStyle === "string" && fm.danceStyle.trim()) danceStyle = fm.danceStyle.trim();
      if (typeof fm.class === "string" && fm.class.trim()) classLevel = fm.class.trim();
      if (typeof fm.classLevel === "string" && fm.classLevel.trim()) classLevel = fm.classLevel.trim();
    }

    const playCount = typeof fm?.playCount === "number" && isFinite(fm.playCount)
      ? Math.max(0, Math.floor(fm.playCount))
      : undefined;
    const lastPlayedAt = typeof fm?.lastPlayedAt === "number" && isFinite(fm.lastPlayedAt)
      ? fm.lastPlayedAt
      : undefined;

    items.push({
      path: f.path,
      basename: f.basename,
      ext: f.extension,
      name,
      description,
      dance,
      danceStyle,
      classLevel,
      thumbPath: thumb?.path,
      playCount,
      lastPlayedAt,
    });
  }

  // sort by path for stable order
  items.sort((a, b) => a.path.localeCompare(b.path));
  return items;
}

export async function upsertSidecarMetadata(
  vault: Vault,
  videoPath: string,
  meta: Partial<{ stepName: string; description: string; dance: string; danceStyle: string; class: string; classLevel: string; playCount: number; lastPlayedAt: number }>
): Promise<void> {
  const af = vault.getAbstractFileByPath(videoPath);
  if (!(af instanceof TFile)) return;
  const parent = af.parent;
  if (!parent) return;
  const mdPath = normalizePath(`${parent.path}/${af.basename}.md`);
  const existing = vault.getAbstractFileByPath(mdPath);

  const fm: SidecarFM = {};
  if (existing instanceof TFile) {
    try {
      const content = await vault.read(existing);
      if (content.startsWith("---")) {
        const end = content.indexOf("\n---", 3);
        if (end > 0) {
          const yaml = content.slice(3, end).trim();
          const parsed = parseYaml(yaml) as unknown;
          if (isRecord(parsed)) Object.assign(fm, parsed);
          const body = content.slice(end + 4);
          // keep body if any
          fm.__body = body;
        }
      } else {
        fm.__body = content;
      }
    } catch {
      // ignore
    }
  }

  // apply updates
  const prevDance = typeof fm.dance === "string" ? fm.dance : undefined;
  if (meta.stepName !== undefined) fm.stepName = meta.stepName;
  if (meta.description !== undefined) fm.description = meta.description;
  if (meta.dance !== undefined) fm.dance = meta.dance;
  if (meta.danceStyle !== undefined) {
    fm.style = meta.danceStyle;
    fm.danceStyle = meta.danceStyle;
  }
  const cls = meta.class ?? meta.classLevel;
  if (cls !== undefined) fm.class = cls;
  if (meta.playCount !== undefined) fm.playCount = Math.max(0, Math.floor(meta.playCount as number));
  if (meta.lastPlayedAt !== undefined) fm.lastPlayedAt = Math.floor(meta.lastPlayedAt as number);

  // Ensure hashtags in body (outside frontmatter) for Graph View
  const normalizeTag = (s: string) => s.trim().replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const danceTag = typeof fm.dance === 'string' && fm.dance ? normalizeTag(fm.dance) : "";
  const tagsLine = danceTag ? `#DanceLibrary #${danceTag}` : `#DanceLibrary`;
  // remove tag key from FM if previously stored there
  if (Object.prototype.hasOwnProperty.call(fm, 'tags')) {
    delete fm.tags;
  }

  // Prepare body with hashtags at the top
  const existingBody = typeof fm.__body === "string" ? fm.__body : "";
  const bodyWithoutOldTagLine = existingBody
    .split(/\r?\n/)
    .filter((ln, idx) => !(idx === 0 && ln.trim().startsWith('#DanceLibrary')))
    .join('\n')
    .replace(/^\n+/, "");
  const finalBody = `${tagsLine}\n\n${bodyWithoutOldTagLine}`.replace(/\n+$/m, "\n");

  const lines: string[] = ["---"];
  for (const [k, v] of Object.entries(fm)) {
    if (k === "__body") continue;
    if (v === undefined) continue;
    lines.push(`${k}: ${String(v)}`);
  }
  lines.push("---");
  const out = lines.join("\n") + "\n\n" + finalBody;

  if (existing instanceof TFile) {
    await vault.modify(existing, out);
  } else {
    await vault.create(mdPath, out);
  }
}
