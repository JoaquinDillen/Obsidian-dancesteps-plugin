/**
 * Dashboard component
 *
 * High-level React component that renders the dance steps library UI:
 * - Header with title, total count, and add button
 * - Search input and filter drawer trigger
 * - Active filters summary
 * - Grid of filtered steps with actions (play/view, edit, delete)
 * - Step editor form (add/edit)
 * - Fullscreen video viewer
 *
 * This component is stateful and coordinates user interactions, delegating
 * visuals to child components. Behavior is kept identical to the previous
 * implementation; this pass focuses on documentation and small polish.
 */

import { useState, useMemo, useEffect } from "react";
import { Search, Filter, Plus } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { StepItem, Filters } from "../types/dance";
import { filterAndSortSteps, getUniqueValues } from "../data/mockData";
import { GridLibrary } from "./GridLibrary";
import { FilterDrawer } from "./FilterDrawer";
import { StepForm } from "./StepForm";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { VideoViewer } from "./VideoViewer";

/** Props for the Dashboard component. */
interface DashboardProps {
  /** Full list of available steps to display. */
  steps: StepItem[];
  /** Called when a step is selected from the grid. */
  onStepSelect: (step: StepItem) => void;
  /** Called when the user clicks the global "Add Step" button. */
  onAddStep: () => void;
  /** Called when a step has been edited successfully. */
  onEditStep: (step: StepItem) => void;
  /** Called when a step is deleted. */
  onDeleteStep: (stepId: string) => void;
  /** Optional: Persist edits. If provided, awaited during save. */
  onSaveEdit?: (originalId: string, updated: StepItem) => Promise<void> | void;
  /**
   * Optional: External signal to open the editor for a given step.
   * The `token` should change for subsequent requests to ensure `useEffect` triggers.
   */
  externalEdit?: { step: StepItem; token: number } | null;
}

/**
 * Dashboard: coordinates library search/filter, step management (add/edit/delete),
 * and a fullscreen video viewer. It mirrors incoming steps into local state so the UI
 * can respond immediately to interactions before parent persistence completes.
 */
export function Dashboard({
  steps,
  onStepSelect,
  onAddStep,
  onEditStep,
  onDeleteStep,
  onSaveEdit,
  externalEdit,
}: DashboardProps) {
  // Local query for full-text search across step fields
  const [searchQuery, setSearchQuery] = useState("");
  // Visibility of the filter drawer panel
  const [showFilters, setShowFilters] = useState(false);
  // Local working copy of steps to support optimistic updates
  const [localSteps, setLocalSteps] = useState<StepItem[]>(steps);
  // Controls the StepForm dialog
  const [isFormOpen, setIsFormOpen] = useState(false);
  // The step currently being edited (if any)
  const [editingStep, setEditingStep] = useState<StepItem | null>(null);
  // The step currently opened in the fullscreen video viewer (if any)
  const [viewerStep, setViewerStep] = useState<StepItem | null>(null);

  // Keep local steps in sync when the upstream `steps` prop changes
  useEffect(() => {
    setLocalSteps(steps);
  }, [steps]);

  // If parent requests to open editor for a specific step (e.g., just imported), do it
  useEffect(() => {
    if (externalEdit?.step) {
      setEditingStep(externalEdit.step);
      setIsFormOpen(true);
      // Ensure the requested step exists in the local list (idempotent)
      setLocalSteps((prev) => {
        if (prev.some((s) => s.id === externalEdit.step.id)) return prev;
        return [...prev, externalEdit.step];
      });
    }
  }, [externalEdit?.token]);

  // Active filter state for classes, dances, styles, and sort order
  const [filters, setFilters] = useState<Filters>({
    classes: [],
    dances: [],
    styles: [],
    sort: "az",
  });

  // Derived list applying search + filters + sort
  const filteredSteps = useMemo(() => {
    return filterAndSortSteps(localSteps, searchQuery, filters);
  }, [localSteps, searchQuery, filters]);

  // Quick flags to reflect current filter usage in the UI
  const hasActiveFilters =
    filters.classes.length > 0 ||
    filters.dances.length > 0 ||
    filters.styles.length > 0;
  const totalActiveFilters =
    filters.classes.length + filters.dances.length + filters.styles.length;

  /** Update the search query string. */
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  /** Replace current filters with a new set. */
  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
  };

  /** Open the editor for a selected step. */
  const handleOpenEdit = (step: StepItem) => {
    setEditingStep(step);
    setIsFormOpen(true);
  };

  /**
   * Persist edits for the current `editingStep` using the StepForm payload.
   * Applies an optimistic update to local state, then awaits `onSaveEdit` if provided
   * and notifies parent via `onEditStep`.
   */
  const handleSave = async (data: Omit<StepItem, "id" | "addedAt">) => {
    if (!editingStep) return;

    const updated: StepItem = {
      ...editingStep,
      stepName: data.stepName,
      description: data.description,
      class: data.class,
      dance: data.dance,
      style: data.style,
      duration: data.duration,
      playCount: data.playCount,
      lastPlayedAt: data.lastPlayedAt,
    };

    // Optimistically update local cache for immediate UI feedback
    setLocalSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === editingStep.id);
      if (idx >= 0) {
        const next = prev.slice();
        next[idx] = updated;
        return next;
      }
      return [...prev, updated];
    });

    // Await external persistence if available
    await onSaveEdit?.(editingStep.id, updated);

    // Notify parent of the change (e.g., for analytics or further processing)
    onEditStep?.(updated);
  };

  /**
   * Delete a step from local state and notify parent.
   * Parent may also handle persistence (e.g., removing associated files).
   */
  const handleDelete = (stepId: string) => {
    setLocalSteps((prev) => prev.filter((s) => s.id !== stepId));
    onDeleteStep?.(stepId);
  };

  // Track whether the viewer should autoplay when opened via the Play button
  const [viewerAutoPlay, setViewerAutoPlay] = useState(false);

  /**
   * Open the fullscreen video viewer for a given step.
   * Also increments the step's play count optimistically.
   */
  const openViewer = (step: StepItem) => {
    // Increment local play count when the user taps play on a card
    setLocalSteps((prev) =>
      prev.map((s) =>
        s.id === step.id ? { ...s, playCount: (s.playCount ?? 0) + 1 } : s
      )
    );
    const bumped = { ...step, playCount: (step.playCount ?? 0) + 1, lastPlayedAt: Date.now() } as StepItem;
    // Persist play count immediately so it survives reloads
    onSaveEdit?.(step.id, bumped);
    setViewerAutoPlay(true);
    setViewerStep(bumped);
  };

  /** Close the fullscreen viewer. */
  const closeViewer = () => setViewerStep(null);

  /** Update the viewer to show a different step (e.g., next/previous). */
  const handleViewerChange = (step: StepItem) => setViewerStep(step);

  return (
    <div className="dr-dashboard" data-tour-root>
      {/* Header */}
      <div className="dr-header" data-tour="header">
        <div className="dr-header-row">
          <div className="dr-header-left">
            <h1 className="dr-title">Dance Library</h1>
            <Badge>{filteredSteps.length} steps</Badge>
          </div>
          {/* Primary action: add a new step */}
          <Button onClick={onAddStep} aria-label="Add a new step">
            <Plus aria-hidden="true" />
            Add Step
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="dr-search-row" data-tour="search">
          <div className="dr-search-input">
            {/* Decorative icon for search input */}
            <Search className="dr-search-icon" aria-hidden="true" />
            <Input
              placeholder="Search dance steps..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="dr-input"
            />
          </div>
          {/* Opens the filter drawer; shows a badge with active count when applicable */}
          <Button onClick={() => setShowFilters(true)} aria-label="Open filters" data-tour="filters">
            <Filter aria-hidden="true" />
            {hasActiveFilters ? (
              <span className="dr-inline-count">{totalActiveFilters}</span>
            ) : null}
          </Button>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="dr-active-filters">
            {filters.classes.map((className) => (
              <Badge key={className}>Class: {className}</Badge>
            ))}
            {filters.dances.map((dance) => (
              <Badge key={dance}>{dance}</Badge>
            ))}
            {filters.styles.map((style) => (
              <Badge key={style}>{style}</Badge>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="dr-content" data-tour="grid">
        <GridLibrary
          steps={filteredSteps}
          onStepSelect={onStepSelect}
          onEditStep={handleOpenEdit}
          onDeleteStep={handleDelete}
          onPlayFull={openViewer}
        />
      </div>

      {/* Filter Drawer */}
      <FilterDrawer
        open={showFilters}
        onOpenChange={setShowFilters}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        steps={localSteps}
      />

      {/* Edit/Add form */}
      <StepForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        editingStep={editingStep || undefined}
        suggestions={getUniqueValues(localSteps)}
      />

      {/* Fullscreen viewer */}
      <Dialog
        open={!!viewerStep}
        onOpenChange={(open: boolean) => {
          if (!open) closeViewer();
        }}
      >
        <DialogContent className="dr-fullscreen-dialog" aria-describedby={undefined}>
          {/* Visually hidden title for accessibility */}
          <DialogTitle className="sr-only">
            Video viewer
          </DialogTitle>
          {viewerStep && (
            <VideoViewer
              step={viewerStep}
              allSteps={filteredSteps}
              onBack={closeViewer}
              onStepChange={handleViewerChange}
              onEditStep={handleOpenEdit}
              onDeleteStep={(id) => {
                handleDelete(id);
                closeViewer();
              }}
              onOpenPath={() => {}}
              onRevealPath={() => {}}
              onCopyPath={() => {}}
              autoPlayInitial={viewerAutoPlay}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
