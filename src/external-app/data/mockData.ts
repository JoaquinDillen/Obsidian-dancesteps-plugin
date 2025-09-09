import type { StepItem, Filters } from "../types/dance";

// unique facet values from your real steps
export function getUniqueValues(steps: StepItem[]) {
  const classes = new Set<string>();
  const dances = new Set<string>();
  const styles = new Set<string>();
  for (const s of steps) {
    if (s.class) classes.add(s.class);
    if (s.dance) dances.add(s.dance);
    if (s.style) styles.add(s.style);
  }
  return {
    classes: Array.from(classes).sort(),
    dances: Array.from(dances).sort(),
    styles: Array.from(styles).sort(),
  };
}

// filter + sort using the Filters shape your UI expects
export function filterAndSortSteps(
  steps: StepItem[],
  query: string,
  filters: Filters
) {
  const q = (query || "").trim().toLowerCase();

  let list = steps.filter((s) => {
    if (q) {
      const hay =
        `${s.stepName} ${s.description || ""} ${s.dance || ""} ${s.style || ""} ${s.class || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.classes?.length && (!s.class || !filters.classes.includes(s.class))) return false;
    if (filters.dances?.length && (!s.dance || !filters.dances.includes(s.dance))) return false;
    if (filters.styles?.length && (!s.style || !filters.styles.includes(s.style))) return false;
    return true;
  });

  const sort = filters.sort || "recent";
  if (sort === "az") {
    list.sort((a, b) => a.stepName.localeCompare(b.stepName));
  } else if (sort === "recent") {
    // use addedAt if present, else fallback to name
    list.sort(
      (a, b) =>
        (b.addedAt || 0) - (a.addedAt || 0) ||
        b.stepName.localeCompare(a.stepName)
    );
  } else if (sort === "mostPlayed") {
    list.sort(
      (a, b) => (b.playCount || 0) - (a.playCount || 0) || a.stepName.localeCompare(b.stepName)
    );
  }

  return list;
}
