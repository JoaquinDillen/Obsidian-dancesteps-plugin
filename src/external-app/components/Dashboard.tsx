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

interface DashboardProps {
  steps: StepItem[];
  onStepSelect: (step: StepItem) => void;
  onAddStep: () => void;
  onEditStep: (step: StepItem) => void;
  onDeleteStep: (stepId: string) => void;
  onSaveEdit?: (originalId: string, updated: StepItem) => Promise<void> | void;
}

export function Dashboard({ steps, onStepSelect, onAddStep, onEditStep, onDeleteStep, onSaveEdit }: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [localSteps, setLocalSteps] = useState<StepItem[]>(steps);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<StepItem | null>(null);

  useEffect(() => {
    setLocalSteps(steps);
  }, [steps]);

  const [filters, setFilters] = useState<Filters>({
    classes: [],
    dances: [],
    styles: [],
    sort: "az"
  });

  const filteredSteps = useMemo(() => {
    return filterAndSortSteps(localSteps, searchQuery, filters);
  }, [localSteps, searchQuery, filters]);

  const hasActiveFilters = filters.classes.length > 0 || filters.dances.length > 0 || filters.styles.length > 0;
  const totalActiveFilters = filters.classes.length + filters.dances.length + filters.styles.length;

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
  };

  const handleOpenEdit = (step: StepItem) => {
    setEditingStep(step);
    setIsFormOpen(true);
  };

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
    setLocalSteps(prev => prev.map(s => s.id === editingStep.id ? updated : s));
    await onSaveEdit?.(editingStep.id, updated);
    onEditStep?.(updated);
  };

  const handleDelete = (stepId: string) => {
    setLocalSteps(prev => prev.filter(s => s.id !== stepId));
    onDeleteStep?.(stepId);
  };

  return (
    <div className="dr-dashboard">
      {/* Header */}
      <div className="dr-header">
        <div className="dr-header-row">
          <div className="dr-header-left">
            <h1 className="dr-title">Dance Library</h1>
            <Badge>
              {filteredSteps.length} steps
            </Badge>
          </div>
          <Button onClick={onAddStep}>
            <Plus />
            Add Step
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="dr-search-row">
          <div className="dr-search-input">
            <Search className="dr-search-icon" />
            <Input
              placeholder="Search dance steps..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="dr-input"
            />
          </div>
          <Button onClick={() => setShowFilters(true)}>
            <Filter />
            {hasActiveFilters ? (
              <span style={{ marginLeft: 6, fontSize: 12 }}>
                {totalActiveFilters}
              </span>
            ) : null}
          </Button>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="dr-active-filters">
            {filters.classes.map((className) => (
              <Badge key={className}>
                Class: {className}
              </Badge>
            ))}
            {filters.dances.map((dance) => (
              <Badge key={dance}>
                {dance}
              </Badge>
            ))}
            {filters.styles.map((style) => (
              <Badge key={style}>
                {style}
              </Badge>
            ))}
          </div>
        )}

      </div>

      {/* Content */}
      <div className="dr-content">
        <GridLibrary
          steps={filteredSteps}
          onStepSelect={onStepSelect}
          onEditStep={handleOpenEdit}
          onDeleteStep={handleDelete}
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
    </div>
  );
}
