export type VideoExt = "mp4" | "webm" | "mov" | "m4v" | "ogg";

export interface DanceStepMeta {
  name: string;
  description?: string;
  dance?: string;
  style?: string;
  classLevel?: string;
}

export interface DanceStepItem extends DanceStepMeta {
  path: string; // vault-relative path to the video file
  basename: string; // filename without extension
  ext: VideoExt | string;
  thumbPath?: string; // optional image with same basename
}

export interface DanceRepoState {
  items: DanceStepItem[];
  currentIndex: number;
}

