export type StepItem = {
  id: string;
  videoImport: string; // Import path like "figma:asset/..." or local import
  stepName: string;
  description?: string;
  class?: string;
  dance?: string;
  danceStyle?: string;
  thumbnail?: string;
  duration?: number;
  addedAt: number;
  playCount: number;
  lastPlayedAt?: number;
};

export type Filters = {
  classes: string[];
  dances: string[];
  styles: string[];
  sort: "az" | "recent" | "mostPlayed";
};

export type AppState = {
  currentView: "dashboard" | "video";
  currentStepId?: string;
  filters: Filters;
  searchQuery: string;
  showFilters: boolean;
};
